#!/usr/bin/env python3
"""Irispectra TMT-PD audit (no synthetic results, no automatic diagnosis).
Usage: python research/audit_tmt_pd.py TMT_PD_Dataset.xlsx --out research-output
Outputs metadata, workbook headers, missingness, numeric distributions and cautious
participant-level group comparisons only if explicit group/participant columns exist.
Dependencies: pandas, openpyxl, numpy; optional scipy for Mann-Whitney tests.
"""
import argparse, json, re
from pathlib import Path
import numpy as np
import pandas as pd

GROUP_PATTERNS=[r"^group$",r"diagnos",r"disease",r"^condition$",r"^cohort$",r"^class$",r"^status$"]
PERSON_PATTERNS=[r"participant",r"subject",r"patient[_ ]?id",r"person[_ ]?id",r"^pid$",r"^id$"]
PD_PATTERNS=[r"parkinson",r"^pd$",r"^patient$"]
HC_PATTERNS=[r"healthy",r"^hc$",r"control",r"^normal$"]

def match_column(cols,patterns):
    found=[c for c in cols if any(re.search(p,str(c).strip(),re.I) for p in patterns)]
    return found[0] if len(found)==1 else None

def label(v):
    s=str(v).strip().lower()
    if any(re.search(p,s) for p in PD_PATTERNS): return "PD"
    if any(re.search(p,s) for p in HC_PATTERNS): return "HC"
    return None

def clean(x):
    if isinstance(x,(np.integer,)): return int(x)
    if isinstance(x,(np.floating,)): return float(x) if np.isfinite(x) else None
    if isinstance(x,(pd.Timestamp,)): return x.isoformat()
    return None if pd.isna(x) else str(x)

def audit(path,out):
    out.mkdir(parents=True,exist_ok=True)
    wb=pd.ExcelFile(path)
    sheets=[]; analyses=[]; notes=[]
    for sheet_name in wb.sheet_names:
        df=pd.read_excel(wb,sheet_name=sheet_name)
        df.columns=[str(c).strip() for c in df.columns]
        group_col=match_column(df.columns,GROUP_PATTERNS)
        id_col=match_column(df.columns,PERSON_PATTERNS)
        tab={"sheet":sheet_name,"rows":int(len(df)),"columns":list(df.columns),
             "group_column":group_col,"participant_column":id_col,
             "null_fraction":{c:round(float(df[c].isna().mean()),4) for c in df.columns},
             "numeric_columns":list(df.select_dtypes(include=np.number).columns)}
        sheets.append(tab)
        if not group_col or not id_col:
            notes.append(f"{sheet_name}: group/participant mapping ambiguous or missing; infer neither from row order nor filename.")
            continue
        temp=df.copy();temp["_group"]=temp[group_col].map(label)
        temp=temp[temp["_group"].isin(["PD","HC"])&temp[id_col].notna()]
        subjects=temp[[id_col,"_group"]].drop_duplicates()
        ambiguous=subjects.groupby(id_col)["_group"].nunique()
        if (ambiguous>1).any():
            notes.append(f"{sheet_name}: participant IDs appear in both groups; skip comparisons.")
            continue
        group_n=subjects["_group"].value_counts().to_dict()
        if min(group_n.get("PD",0),group_n.get("HC",0))<3:
            notes.append(f"{sheet_name}: fewer than 3 participants in one group; skip comparisons.")
            continue
        for col in df.select_dtypes(include=np.number).columns:
            if col==id_col or col==group_col: continue
            subj=temp.groupby([id_col,"_group"],dropna=False)[col].median().reset_index()
            pv=subj.loc[subj["_group"]=="PD",col].dropna()
            hv=subj.loc[subj["_group"]=="HC",col].dropna()
            if len(pv)<3 or len(hv)<3: continue
            analyses.append({"sheet":sheet_name,"metric":col,"aggregation":"participant median of event rows",
                "pd_participants":len(pv),"hc_participants":len(hv),
                "pd_median":float(pv.median()),"hc_median":float(hv.median()),
                "median_difference_PD_minus_HC":float(pv.median()-hv.median()),
                "exploratory":True,"statistical_test":"not performed; features not preregistered"})
    result={"source":"TMT-PD DOI 10.17632/rtf7jjssct.1","input_name":path.name,
            "limitations":["Automatic header mappings are heuristics; verify against codebook.",
            "Participant medians are descriptive, not adjusted for covariates, age, disease severity, medication or task.",
            "If a workbook contains mixed task types, stratify by task before inference.",
            "No trial-level leakage; these are NOT independent observations.",
            "No clinical classification or biomarker discovery claim."],
            "sheets":sheets,"notes":notes,"comparisons":analyses}
    (out/"audit.json").write_text(json.dumps(result,indent=2,ensure_ascii=False,default=clean),encoding="utf-8")
    pd.DataFrame(analyses).to_csv(out/"participant_descriptives.csv",index=False)
    print(f"Audited {len(sheets)} sheets; {len(analyses)} exploratory metric summaries.")
    print("Outputs:",out/"audit.json",out/"participant_descriptives.csv")
    for n in notes:print("NOTE:",n)

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("xlsx",type=Path,help="Original TMT-PD XLSX workbook")
    p.add_argument("--out",type=Path,default=Path("research-output"))
    args=p.parse_args()
    if not args.xlsx.is_file():p.error(f"File not found: {args.xlsx}")
    audit(args.xlsx,args.out)
