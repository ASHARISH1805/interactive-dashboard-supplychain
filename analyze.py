import pandas as pd
import numpy as np

# Load Data
try:
    df = pd.read_csv('supply_chain_data.csv')
    df['order_date'] = pd.to_datetime(df['order_date'])
    df['ship_date'] = pd.to_datetime(df['ship_date'])
except Exception as e:
    print(f"Error loading data: {e}")
    exit()

print("--- DESCRIPTIVE ANALYTICS ---")
print(f"Total Sales: ${df['sales'].sum():,.2f}")
print(f"Total Profit: ${df['profit'].sum():,.2f}")
print(f"Total Orders: {len(df)}")
print(f"Overall Profit Margin: {(df['profit'].sum() / df['sales'].sum()) * 100:.2f}%")
print(f"Avg Delivery Days: {df['delivery_days'].mean():.2f}")
print("\nSales by Region:")
print(df.groupby('region')[['sales', 'profit']].sum().sort_values('sales', ascending=False))
print("\nSales by Category:")
print(df.groupby('category')[['sales', 'profit']].sum().sort_values('sales', ascending=False))

print("\n--- DIAGNOSTIC ANALYTICS ---")
# Discount vs Profit
correlation = df['discount'].corr(df['profit'])
print(f"Correlation between Discount and Profit: {correlation:.4f}")
# Loss Makers
loss_makers = df[df['profit'] < 0]
print(f"Number of Loss Making Orders: {len(loss_makers)} ({len(loss_makers)/len(df)*100:.2f}%)")
print(f"Total Loss: ${loss_makers['profit'].sum():,.2f}")
print("Top 3 Loss Categories:")
print(loss_makers.groupby('sub_category')['profit'].sum().sort_values().head(3))

print("\n--- SUPPLY CHAIN PERFORMANCE ---")
print("Delivery Efficiency by Ship Mode:")
print(df.groupby('ship_mode')[['delivery_days', 'shipping_cost']].mean())

print("\n--- PRODUCT ANALYTICS ---")
sub_cat_metrics = df.groupby('sub_category').agg({'sales':'sum', 'profit':'sum'})
sub_cat_metrics['margin'] = (sub_cat_metrics['profit'] / sub_cat_metrics['sales']) * 100
print("Top 3 High Margin Sub-Categories:")
print(sub_cat_metrics.sort_values('margin', ascending=False).head(3))
print("Bottom 3 Low Margin Sub-Categories:")
print(sub_cat_metrics.sort_values('margin', ascending=True).head(3))

print("\n--- CUSTOMER ANALYTICS ---")
segment_metrics = df.groupby('segment').agg({'sales':'sum', 'profit':'sum', 'discount':'mean'})
segment_metrics['margin'] = (segment_metrics['profit'] / segment_metrics['sales']) * 100
print("Segment Profitability:")
print(segment_metrics)

print("\n--- GEOGRAPHIC ANALYTICS ---")
print("Lowest Profit Regions:")
print(df.groupby('region')['profit'].sum().sort_values().head(5))

