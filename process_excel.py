import pandas as pd
import json
import numpy as np
import sys

# HOW TO RUN LOCALLY:
# 1. Ensure you have pandas installed: pip install pandas
# 2. Run this script in the terminal: python process_excel.py "path_to_your_raw_meta_export.csv"
# 3. This will generate/update the data.js file in the same directory, which the dashboard uses.

def convert_np(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.floating):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def main():
    if len(sys.argv) < 2:
        print("Usage: python process_excel.py <path_to_csv>")
        sys.exit(1)
        
    raw_data_path = sys.argv[1]
    
    try:
        df = pd.read_csv(raw_data_path, skiprows=2)
    except Exception as e:
        print(f"Error reading file: {e}")
        sys.exit(1)

    df['Amount spent (AUD)'] = df['Amount spent (AUD)'].fillna(0)
    df['Impressions'] = df['Impressions'].fillna(0)
    df['Reach'] = df['Reach'].fillna(0)
    df['Link clicks'] = df.get('Link clicks', pd.Series([0]*len(df))).fillna(0)

    def get_leads(row):
        res_type = str(row['Result type']).lower()
        if 'lead' in res_type:
            return float(row['Results']) if pd.notnull(row['Results']) else 0.0
        return 0.0

    df['Leads'] = df.apply(get_leads, axis=1)

    # Process Campaign Level
    df_camp = df[df['Delivery level'] == 'campaign'].copy()
    df_camp['Spend'] = df_camp['Amount spent (AUD)']
    df_camp['CPL'] = np.where(df_camp['Leads'] > 0, df_camp['Spend'] / df_camp['Leads'], 0)
    df_camp['CPM'] = np.where(df_camp['Impressions'] > 0, (df_camp['Spend'] / df_camp['Impressions']) * 1000, 0)
    df_camp['Frequency'] = np.where(df_camp['Reach'] > 0, df_camp['Impressions'] / df_camp['Reach'], 0)

    campaigns = []
    for _, row in df_camp.iterrows():
        campaigns.append({
            "name": str(row['Campaign name']),
            "status": str(row['Delivery status']),
            "spend": convert_np(row['Spend']),
            "leads": convert_np(row['Leads']),
            "cpl": convert_np(row['CPL']),
            "impressions": convert_np(row['Impressions']),
            "reach": convert_np(row['Reach']),
            "cpm": convert_np(row['CPM']),
            "frequency": convert_np(row['Frequency']),
            "linkClicks": convert_np(row['Link clicks'])
        })

    # Process Ad Level
    df_ad = df[df['Delivery level'] == 'ad'].copy()
    df_ad['Spend'] = df_ad['Amount spent (AUD)']
    df_ad['CPL'] = np.where(df_ad['Leads'] > 0, df_ad['Spend'] / df_ad['Leads'], 0)
    df_ad['CPM'] = np.where(df_ad['Impressions'] > 0, (df_ad['Spend'] / df_ad['Impressions']) * 1000, 0)
    df_ad['Frequency'] = np.where(df_ad['Reach'] > 0, df_ad['Impressions'] / df_ad['Reach'], 0)

    ads = []
    for _, row in df_ad.iterrows():
        ads.append({
            "campaignName": str(row['Campaign name']),
            "adSetName": str(row['Ad set name']),
            "adName": str(row['Ad name']),
            "spend": convert_np(row['Spend']),
            "leads": convert_np(row['Leads']),
            "cpl": convert_np(row['CPL']),
            "impressions": convert_np(row['Impressions']),
            "reach": convert_np(row['Reach']),
            "cpm": convert_np(row['CPM']),
            "frequency": convert_np(row['Frequency'])
        })

    total_spend = convert_np(df_camp['Spend'].sum())
    total_leads = convert_np(df_camp['Leads'].sum())
    avg_cpl = convert_np(df_camp[df_camp['Leads'] > 0]['Spend'].sum() / total_leads if total_leads > 0 else 0)
    total_impressions = convert_np(df_camp['Impressions'].sum())
    total_reach = convert_np(df_camp['Reach'].sum())
    avg_cpm = convert_np((total_spend / total_impressions) * 1000 if total_impressions > 0 else 0)

    dashboardData = {
        "weeks": [
            {
                "weekLabel": "Apr 16 - Apr 22, 2026",
                "isCurrent": True,
                "totals": {
                    "spend": total_spend,
                    "leads": total_leads,
                    "cpl": avg_cpl,
                    "impressions": total_impressions,
                    "reach": total_reach,
                    "cpm": avg_cpm,
                },
                "campaigns": campaigns,
                "ads": ads
            }
        ]
    }

    with open("data.js", "w") as f:
        f.write(f"const dashboardData = {json.dumps(dashboardData, indent=2)};\n")

    print("Created data.js successfully.")

if __name__ == '__main__':
    main()