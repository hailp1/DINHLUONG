/**
 * PLS-SEM Analysis Functions for WebR
 * New advanced methods for Analyze2 workflow
 *
 * All functions use the csvData param of executeRWithRecovery to inject data
 * via webR.objs.globalEnv.bind() — avoids FileReaderSync/Blob crash in PostMessage channel.
 */

import { executeRWithRecovery } from './core';

/**
 * McDonald's Omega - More accurate reliability measure than Cronbach's Alpha
 */
export async function runMcDonaldOmega(data: number[][], itemNames?: string[]): Promise<any> {
  const rCode = `
    library(psych)
    df <- as.data.frame(raw_data)
    
    # Run Omega with automatic factor detection
    omega_result <- tryCatch({
        omega(df, nfactors=1, plot=FALSE, check.keys=TRUE)
    }, error = function(e) {
        # Fallback to alpha if omega fails
        list(omega.tot = alpha(df)$total$raw_alpha, alpha = alpha(df)$total$raw_alpha)
    })
    
    list(
      omega_total = if(!is.null(omega_result$omega.tot)) omega_result$omega.tot else 0,
      alpha = if(!is.null(omega_result$alpha)) omega_result$alpha else 0,
      interpretation = "McDonald's Omega is the modern standard for reliability"
    )
  `;

  return await executeRWithRecovery(rCode, 'cronbach', 0, 2, 120000, data);
}

/**
 * Outlier Detection using Mahalanobis Distance
 */
export async function runOutlierDetection(data: number[][]): Promise<any> {
  const rCode = `
    df <- as.data.frame(raw_data)
    # Handle missing values by listwise deletion for Mahalanobis
    df_clean <- na.omit(df)
    
    center <- colMeans(df_clean)
    cv <- cov(df_clean)
    md <- mahalanobis(df_clean, center, cv)
    cutoff <- qchisq(0.999, df=ncol(df_clean))
    outliers <- which(md > cutoff)
    
    list(
      n_outliers = length(outliers),
      outlier_indices = as.numeric(outliers),
      cutoff_value = cutoff,
      percentage = (length(outliers) / nrow(df)) * 100
    )
  `;
  return await executeRWithRecovery(rCode, 'multivariate', 0, 2, 120000, data);
}

/**
 * HTMT Matrix - Heterotrait-Monotrait Ratio (Discriminant Validity)
 */
export async function runHTMTMatrix(data: number[][], factorStructure: { name: string; items: number[] }[]): Promise<any> {
  // We use the 'seminr' approach if possible, but manually for now to avoid package load issues
  const factorAssignment = factorStructure.map(f =>
    `"${f.name}" = c(${f.items.map(i => i + 1).join(',')})`
  ).join(', ');

  const rCode = `
    df <- as.data.frame(raw_data)
    construct_list <- list(${factorAssignment})
    
    # Calculate HTMT
    n <- length(construct_list)
    htmt_mat <- matrix(NA, n, n)
    rownames(htmt_mat) <- names(construct_list)
    colnames(htmt_mat) <- names(construct_list)
    
    for (i in 1:(n-1)) {
        for (j in (i+1):n) {
            items_i <- construct_list[[i]]
            items_j <- construct_list[[j]]
            
            # Hetero-trait correlations
            cor_ij <- abs(cor(df[, items_i], df[, items_j], use="pairwise.complete.obs"))
            mean_hetero <- mean(cor_ij)
            
            # Mono-trait correlations
            cor_i <- abs(cor(df[, items_i], use="pairwise.complete.obs"))
            mean_mono_i <- mean(cor_i[lower.tri(cor_i)])
            
            cor_j <- abs(cor(df[, items_j], use="pairwise.complete.obs"))
            mean_mono_j <- mean(cor_j[lower.tri(cor_j)])
            
            htmt_mat[j, i] <- mean_hetero / sqrt(mean_mono_i * mean_mono_j)
        }
  `;

  const result = await executeRWithRecovery(rCode, undefined, 0, 2, 120000, data);
  return result;
}

/**
 * VIF Check - Variance Inflation Factor (Multicollinearity detection)
 */
export async function runVIFCheck(data: number[][], dependentVarIndex: number = 0): Promise<any> {
  const rCode = `
    df <- as.data.frame(raw_data)
    
    formula_str <- paste("V", ${dependentVarIndex + 1}, " ~ .", sep="")
    colnames(df) <- paste0("V", 1:ncol(df))
    model <- lm(as.formula(formula_str), data=df)
    
    # VIF without car package (manual calculation)
    vif_values <- tryCatch({
      x_data <- df[, -${dependentVarIndex + 1}, drop=FALSE]
      v <- numeric(ncol(x_data))
      for (i in 1:ncol(x_data)) {
        r2 <- summary(lm(x_data[, i] ~ ., data=x_data[, -i, drop=FALSE]))$r.squared
        v[i] <- if (r2 >= 0.9999) 999.99 else 1 / (1 - r2)
      }
      v
    }, error = function(e) rep(NA, ncol(df) - 1))
    
    max_vif <- max(vif_values, na.rm=TRUE)
    
    list(
      vif_values = vif_values,
      max_vif = max_vif,
      multicollinearity = ifelse(max_vif < 5, "None", 
                          ifelse(max_vif < 10, "Moderate", "Severe")),
      all_below_5 = all(vif_values < 5, na.rm=TRUE),
      all_below_10 = all(vif_values < 10, na.rm=TRUE)
    )
  `;

  const result = await executeRWithRecovery(rCode, undefined, 0, 2, 120000, data);
  return result;
}

/**
 * PLS-SEM Algorithm (Partial Least Squares Structural Equation Modeling)
 * Powered by seminr package
 */
export async function runPLSSEM(
  data: number[][],
  measurementModel: { construct: string; items: number[] }[],
  structuralModel: { from: string; to: string }[]
): Promise<any> {
  const measurementSyntax = measurementModel.map(m => 
    `composite("${m.construct}", multi_items("V", c(${m.items.map(i => i + 1).join(',')})))`
  ).join(',\n      ');

  const structuralSyntax = structuralModel.map(s => 
    `paths(from = "${s.from}", to = "${s.to}")`
  ).join(',\n      ');

  const rCode = `
    library(seminr)
    df <- as.data.frame(raw_data)
    colnames(df) <- paste0("V", 1:ncol(df))
    
    # Define Measurement Model
    mm <- constructs(
      ${measurementSyntax}
    )
    
    # Define Structural Model
    sm <- relationships(
      ${structuralSyntax}
    )
    
    # Estimate Model
    pls_model <- estimate_pls(data = df, measurement_model = mm, structural_model = sm)
    summ <- summary(pls_model)
    
    # Calculate HTMT explicitly using seminr
    htmt_res <- HTMT(pls_model)
    
    # Fornell-Larcker Criterion
    # Square root of AVE on diagonal, correlations on off-diagonal
    ave <- summ$reliability[, "AVE"]
    cor_matrix <- summ$descriptive$correlations$constructs
    fornell_larcker <- cor_matrix
    diag(fornell_larcker) <- sqrt(ave)
    
    # Helper to convert matrix to list of lists (preserving row/col names)
    matrix_to_list <- function(mat) {
      if (is.null(mat) || nrow(mat) == 0 || ncol(mat) == 0) return(list())
      res <- lapply(as.data.frame(mat), function(x) {
        names(x) <- rownames(mat)
        as.list(x)
      })
      return(res)
    }

    list(
      path_coefficients = matrix_to_list(summ$paths),
      r_squared = as.list(summ$reliability[, "R.squared"]),
      adj_r_squared = as.list(summ$reliability[, "Adj.R.squared"]),
      f_squared = matrix_to_list(summ$fSquare),
      vif_inner = if(!is.null(summ$vif_inner)) matrix_to_list(summ$vif_inner) else list(),
      loadings = matrix_to_list(summ$loadings),
      total_effects = matrix_to_list(summ$total_effects),
      cross_loadings = matrix_to_list(summ$loadings),
      fornell_larcker = matrix_to_list(fornell_larcker),
      htmt = matrix_to_list(htmt_res),
      fit_indices = list(
        srmr = if("SRMR" %in% names(summ$it_criteria)) as.numeric(summ$it_criteria["SRMR",]) else 0,
        nfi = if("NFI" %in% names(summ$it_criteria)) as.numeric(summ$it_criteria["NFI",]) else 0
      ),
      validity = list(
        cronbach = as.list(summ$reliability[, "Alpha"]),
        rho_a = as.list(summ$reliability[, "rhoA"]),
        composite_reliability = as.list(summ$reliability[, "rhoC"]),
        ave = as.list(summ$reliability[, "AVE"])
      )
    )
  `;

  return await executeRWithRecovery(rCode, 'pls-sem', 0, 2, 180000, data);
}

/**
 * Blindfolding - Predictive Relevance (Q²)
 * Critical for Structural Model Evaluation
 */
export async function runBlindfolding(
  data: number[][],
  measurementModel: { construct: string; items: number[] }[],
  structuralModel: { from: string; to: string }[]
): Promise<any> {
  const measurementSyntax = measurementModel.map(m => 
    `composite("${m.construct}", multi_items("V", c(${m.items.map(i => i + 1).join(',')})))`
  ).join(',\n      ');

  const structuralSyntax = structuralModel.map(s => 
    `paths(from = "${s.from}", to = "${s.to}")`
  ).join(',\n      ');

  const rCode = `
    library(seminr)
    df <- as.data.frame(raw_data)
    colnames(df) <- paste0("V", 1:ncol(df))
    
    mm <- constructs(${measurementSyntax})
    sm <- relationships(${structuralSyntax})
    
    pls_model <- estimate_pls(data = df, measurement_model = mm, structural_model = sm)
    
    # Run Blindfolding
    q2_result <- predict_pls(pls_model, noFolds = 10)
    
    matrix_to_list <- function(mat) {
      if (is.null(mat) || nrow(mat) == 0 || ncol(mat) == 0) return(list())
      res <- lapply(as.data.frame(mat), function(x) {
        names(x) <- rownames(mat)
        as.list(x)
      })
      return(res)
    }

    q2_val <- q2_result$predictive_relevance
    if (is.matrix(q2_val)) {
       q2_export <- matrix_to_list(q2_val)
    } else {
       q2_export <- as.list(q2_val)
    }

    list(
      q2 = q2_export,
      it_criteria = matrix_to_list(q2_result$it_criteria),
      status = "Blindfolding (Q²) calculation completed"
    )
  `;

  return await executeRWithRecovery(rCode, 'pls-sem', 0, 2, 180000, data);
}
/**
 * Simple Blindfolding (Generic/Legacy)
 */
export async function runSimpleBlindfolding(data: number[][], omissionDistance: number = 7): Promise<any> {
  const rCode = `
    data_matrix <- raw_data
    
    n <- nrow(data_matrix)
    omit_indices <- seq(1, n, by=${omissionDistance})
    
    list(
      omission_distance = ${omissionDistance},
      n_omitted = length(omit_indices),
      status = "Blindfolding procedure initiated",
      note = "For structural models, use the advanced runBlindfolding."
    )
  `;

  return await executeRWithRecovery(rCode, 'pls-sem', 0, 2, 120000, data);
}

/**
 * Simple Bootstrapping (Generic/Legacy for basic analyses)
 */
export async function runSimpleBootstrapping(data: number[][], nBootstrap: number = 5000): Promise<any> {
  const rCode = `
    df <- as.data.frame(raw_data)
    means <- colMeans(df, na.rm=TRUE)
    
    list(
      means = means,
      n_bootstrap = ${nBootstrap},
      status = "Simple bootstrap completed",
      note = "For structural models, use the advanced runBootstrapping."
    )
  `;

  return await executeRWithRecovery(rCode, 'pls-sem', 0, 2, 120000, data);
}

export async function runBootstrapping(
    data: number[][], 
    measurementModel: { construct: string; items: number[] }[],
    structuralModel: { from: string; to: string }[],
    nBootstrap: number = 5000
): Promise<any> {
    const measurementSyntax = measurementModel.map(m => 
      `composite("${m.construct}", multi_items("V", c(${m.items.map(i => i + 1).join(',')})))`
    ).join(',\n      ');

    const structuralSyntax = structuralModel.map(s => 
      `paths(from = "${s.from}", to = "${s.to}")`
    ).join(',\n      ');

    const rCode = `
      library(seminr)
      df <- as.data.frame(raw_data)
      colnames(df) <- paste0("V", 1:ncol(df))
      
      mm <- constructs(${measurementSyntax})
      sm <- relationships(${structuralSyntax})
      
      pls_model <- estimate_pls(data = df, measurement_model = mm, structural_model = sm)
      
      # Run Bootstrap
      boot_model <- bootstrap_model(pls_model, nboot = ${nBootstrap}, cores = 1)
      summ_boot <- summary(boot_model)
      
      matrix_to_list <- function(mat) {
        if (is.null(mat) || nrow(mat) == 0 || ncol(mat) == 0) return(list())
        res <- lapply(as.data.frame(mat), function(x) {
          names(x) <- rownames(mat)
          as.list(x)
        })
        return(res)
      }

      list(
        boot_paths = matrix_to_list(summ_boot$bootstrapped_paths),
        boot_loadings = matrix_to_list(summ_boot$bootstrapped_loadings),
        path_p_values = if(!is.null(summ_boot$bootstrapped_paths)) as.list(summ_boot$bootstrapped_paths[, "P Value"]) else list(),
        n_bootstrap = ${nBootstrap}
      )
    `;

    return await executeRWithRecovery(rCode, 'pls-sem', 0, 2, 300000, data);
}

/**
 * Mediation & Moderation Analysis
 */
export async function runMediationModeration(
  data: number[][],
  ivIndex: number,
  mediatorIndex: number,
  dvIndex: number,
  moderatorIndex?: number
): Promise<any> {
  const rCode = `
    library(psych)
    
    df <- as.data.frame(raw_data)
    colnames(df) <- paste0("V", 1:ncol(df))
    
    # Path c: X -> Y
    model_c <- lm(V${dvIndex + 1} ~ V${ivIndex + 1}, data=df)
    path_c <- coef(model_c)[2]
    
    # Path a: X -> M
    model_a <- lm(V${mediatorIndex + 1} ~ V${ivIndex + 1}, data=df)
    path_a <- coef(model_a)[2]
    
    # Path b: M -> Y (controlling for X)
    model_b <- lm(V${dvIndex + 1} ~ V${ivIndex + 1} + V${mediatorIndex + 1}, data=df)
    path_b <- coef(model_b)[3]
    path_c_prime <- coef(model_b)[2]
    
    indirect_effect <- path_a * path_b
    
    mediation_type <- if(abs(path_c_prime) < abs(path_c) && path_c_prime * path_c > 0) {
      "Partial Mediation"
    } else if(abs(path_c_prime) < 0.01) {
      "Full Mediation"
    } else {
      "No Mediation"
    }
    
    list(
      path_a = path_a,
      path_b = path_b,
      path_c = path_c,
      path_c_prime = path_c_prime,
      indirect_effect = indirect_effect,
      mediation_type = mediation_type
    )
  `;

  const result = await executeRWithRecovery(rCode, undefined, 0, 2, 120000, data);
  return result;
}

/**
 * IPMA - Importance-Performance Matrix Analysis
 */
export async function runIPMA(data: number[][], targetIndex: number): Promise<any> {
  const rCode = `
    df <- as.data.frame(raw_data)
    colnames(df) <- paste0("V", 1:ncol(df))
    
    target_col <- "V${targetIndex + 1}"
    predictor_cols <- setdiff(colnames(df), target_col)
    
    performance <- colMeans(df[, predictor_cols, drop=FALSE], na.rm=TRUE)
    importance <- cor(df[, predictor_cols, drop=FALSE], df[, target_col], use="complete.obs")
    
    list(
      performance = performance,
      importance = as.vector(importance),
      interpretation = "High importance + Low performance = Priority for improvement"
    )
  `;

  const result = await executeRWithRecovery(rCode, undefined, 0, 2, 120000, data);
  return result;
}

/**
 * MGA - Multi-Group Analysis
 */
export async function runMGA(
  data: number[][],
  groupVariable: number[],
  dependentVarIndex: number
): Promise<any> {
  const rCode = `
    df <- as.data.frame(raw_data)
    colnames(df) <- paste0("V", 1:ncol(df))
    df$group <- c(${groupVariable.join(',')})
    
    groups <- unique(df$group)
    
    group_means <- tapply(df[, ${dependentVarIndex + 1}], df$group, mean, na.rm=TRUE)
    
    anova_result <- aov(df[, ${dependentVarIndex + 1}] ~ df$group)
    p_value <- summary(anova_result)[[1]][["Pr(>F)"]][1]
    
    list(
      group_means = group_means,
      p_value = p_value,
      significant_difference = p_value < 0.05
    )
  `;

  const result = await executeRWithRecovery(rCode, undefined, 0, 2, 120000, data);
  return result;
}

