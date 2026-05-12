/**
 * Descriptive Statistics & Validation - Template-Driven
 */
import { WEBR_TIMEOUTS, getTimeoutForMethod } from '../constants';
import { executeRWithRecovery, loadPackagesForMethod } from '../core';
import { parseWebRResult } from '../utils';
import { getAnalysisRTemplate } from '../templates';

/**
 * Data Validation Helper
 */
export function validateData(data: number[][], minVars: number = 1, functionName: string = 'Analysis'): void {
    if (!data || data.length === 0) throw new Error(`${functionName}: Dá»¯ liá»‡u trá»‘ng`);
    if (data[0].length < minVars) throw new Error(`${functionName}: Cáº§n Ã­t nháº¥t ${minVars} biáº¿n`);
    if (data.some(row => row.some(val => val === Infinity || val === -Infinity))) {
        throw new Error(`${functionName}: Dá»¯ liá»‡u chá»©a giÃ¡ trá»‹ vÃ´ cá»±c (Infinity)`);
    }
    for (let col = 0; col < data[0].length; col++) {
        const values = data.map(row => row[col]);
        if (values.every(v => v === values[0])) {
            throw new Error(`${functionName}: Biáº¿n thá»© ${col + 1} cÃ³ giÃ¡ trá»‹ khÃ´ng Ä‘á»•i(variance = 0)`);
        }
    }
}

/**
 * Run descriptive statistics
 */
export async function runDescriptiveStats(data: number[][]): Promise<{
    mean: number[];
    sd: number[];
    min: number[];
    max: number[];
    median: number[];
    N: number[];
    skew: number[];
    kurtosis: number[];
    se: number[];
    rCode: string;
}> {
    await loadPackagesForMethod('descriptive');
    const defaultRCode = `
    library(psych);
    df <- as.data.frame({{data}});
    colnames(df) <- paste0("V", 1:ncol(df));
    desc <- describe(df, fast=FALSE);
    list(
        mean = as.numeric(desc$mean),
        sd = as.numeric(desc$sd),
        min = as.numeric(desc$min),
        max = as.numeric(desc$max),
        median = as.numeric(desc$median),
        n = as.numeric(desc$n),
        skew = as.numeric(desc$skew),
        kurtosis = as.numeric(desc$kurtosis),
        se = as.numeric(desc$se)
    );
    `;
    const template = await getAnalysisRTemplate('descriptive', defaultRCode);
    const rCode = template.replace(/\{\{data\}\}/g, 'raw_data');
    const result = await executeRWithRecovery(rCode, 'descriptive', 0, 2, WEBR_TIMEOUTS.COMPLEX, data);
    const getValue = parseWebRResult(result);
    return {
        mean: getValue('mean') || [],
        sd: getValue('sd') || [],
        min: getValue('min') || [],
        max: getValue('max') || [],
        median: getValue('median') || [],
        N: getValue('n') || [],
        skew: getValue('skew') || [],
        kurtosis: getValue('kurtosis') || [],
        se: getValue('se') || [],
        rCode
    };
}
/**
 * Run frequency analysis for categorical data (Demographics)
 */
export async function runFrequencyAnalysis(data: number[][], columns?: string[]): Promise<{
    frequencies: {
        column: string;
        categories: {
            value: string | number;
            count: number;
            percentage: number;
        }[];
    }[];
    rCode: string;
}> {
    await loadPackagesForMethod('descriptive');
    const rCode = `
    df <- as.data.frame(raw_data)
    if(!is.null(c({{columns}}))) {
        colnames(df) <- c({{columns}})
    } else {
        colnames(df) <- paste0("V", 1:ncol(df))
    }
    
    results <- lapply(colnames(df), function(col) {
        tbl <- table(df[[col]], useNA = "no")
        pct <- prop.table(tbl) * 100
        
        list(
            column = col,
            categories = lapply(seq_along(tbl), function(i) {
                list(
                    value = names(tbl)[i],
                    count = as.numeric(tbl[i]),
                    percentage = as.numeric(pct[i])
                )
            })
        )
    })
    results
    `;

    const colNames = columns ? columns.map(c => `"${c}"`).join(',') : 'NULL';
    const finalRCode = rCode.replace(/\{\{columns\}\}/g, colNames);
    
    const result = await executeRWithRecovery(finalRCode, 'descriptive', 0, 2, WEBR_TIMEOUTS.BASIC, data);
    const getValue = parseWebRResult(result);
    
    // Parse the list of lists from WebR
    const frequencies: any[] = [];
    const nCols = data[0].length;
    
    for (let i = 0; i < nCols; i++) {
        const colData = parseWebRResult(getValue(i));
        const categoriesRaw = colData('categories') || [];
        const categories = categoriesRaw.map((cat: any) => {
            const catData = parseWebRResult(cat);
            return {
                value: catData('value')?.[0] ?? 'Unknown',
                count: catData('count')?.[0] ?? 0,
                percentage: catData('percentage')?.[0] ?? 0
            };
        });
        
        frequencies.push({
            column: colData('column')?.[0] || `Variable ${i+1}`,
            categories
        });
    }

    return { frequencies, rCode: finalRCode };
}
