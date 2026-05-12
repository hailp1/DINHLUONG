# api.R
library(plumber)
library(jsonlite)
library(psych)
library(lavaan)
library(seminr)

#* @filter cors
function(res) {
  res$setHeader("Access-Control-Allow-Origin", "*")
  res$setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res$setHeader("Access-Control-Allow-Headers", "Content-Type")
  plumber::forward()
}

#* @post /descriptive
#* @param data JSON data array
function(data) {
  df <- as.data.frame(data)
  results <- list()
  
  for(col in names(df)) {
    tbl <- table(df[[col]])
    prop <- prop.table(tbl) * 100
    
    categories <- mapply(function(val, pct) {
      list(value = val, percentage = as.numeric(pct))
    }, names(tbl), prop, SIMPLIFY = FALSE)
    
    results[[length(results) + 1]] <- list(
      column = col,
      categories = categories
    )
  }
  
  return(list(frequencies = results))
}

#* @post /reliability
#* @param data JSON data array
function(data) {
  df <- as.data.frame(data)
  alpha_res <- psych::alpha(df, check.keys = TRUE)
  
  item_stats <- list()
  for(i in 1:nrow(alpha_res$item.stats)) {
    item_stats[[length(item_stats) + 1]] <- list(
      itemName = rownames(alpha_res$item.stats)[i],
      correctedItemTotalCorrelation = as.numeric(alpha_res$item.stats$r.drop[i]),
      alphaIfItemDeleted = as.numeric(alpha_res$alpha.drop$raw_alpha[i])
    )
  }
  
  return(list(
    alpha = as.numeric(alpha_res$total$raw_alpha),
    itemTotalStats = item_stats
  ))
}

#* @post /efa
#* @param data JSON data array
#* @param nfactors Number of factors
function(data, nfactors = 0) {
  df <- as.data.frame(data)
  
  # KMO and Bartlett
  kmo_res <- psych::KMO(df)
  bartlett_res <- psych::cortest.bartlett(cor(df), n = nrow(df))
  
  # Determine nfactors if 0
  if(nfactors == 0) {
    ev <- eigen(cor(df))$values
    nfactors <- sum(ev > 1)
  }
  
  efa_res <- psych::fa(df, nfactors = nfactors, rotate = "promax", fm = "ml")
  
  loadings_mat <- as.matrix(efa_res$loadings)
  loadings_list <- apply(loadings_mat, 1, function(x) as.list(x))
  
  return(list(
    kmo = as.numeric(kmo_res$MSA),
    bartlettP = as.numeric(bartlett_res$p.value),
    nFactorsUsed = as.numeric(nfactors),
    loadings = loadings_list
  ))
}

#* @post /pls-sem
#* @param data JSON data array
#* @param mm Measurement model JSON
#* @param sm Structural model JSON
function(data, mm, sm) {
  df <- as.data.frame(data)
  
  # Convert JSON models to seminr format
  # mm structure: [{construct: 'F1', items: ['q1', 'q2']}]
  # sm structure: [{from: 'F1', to: 'F2'}]
  
  measurements <- list()
  for(m in mm) {
    # If items are indices, map to names
    item_names <- if(is.numeric(m$items[[1]])) names(df)[unlist(m$items) + 1] else unlist(m$items)
    measurements[[length(measurements) + 1]] <- seminr::composite(m$construct, item_names)
  }
  m_model <- do.call(seminr::constructs, measurements)
  
  paths <- list()
  for(s in sm) {
    paths[[length(paths) + 1]] <- seminr::paths(from = s$from, to = s$to)
  }
  s_model <- do.call(seminr::relationships, paths)
  
  # Run PLS
  pls_model <- seminr::estimate_pls(data = df, measurement_model = m_model, structural_model = s_model)
  summary_pls <- summary(pls_model)
  
  # Bootstrapping
  boot_model <- seminr::bootstrap_model(pls_model, nboot = 500)
  summary_boot <- summary(boot_model)
  
  return(list(
    path_coefficients = summary_pls$paths,
    r_squared = summary_pls$paths_summary$r_squared,
    adj_r_squared = summary_pls$paths_summary$adj_r_squared,
    fit_indices = list(srmr = as.numeric(summary_pls$reliability$SRMR)),
    path_p_values = summary_boot$bootstrapped_paths[, "Pr(>|t|)"]
  ))
}
