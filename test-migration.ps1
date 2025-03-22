# PowerShell script to test Supabase migration
# This script directly executes SQL against the Supabase database

# Configuration
$SUPABASE_URL = "https://ajqjufxcwoektjdogogq.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqcWp1Znhjd29la3RqZG9nb2dxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjI1MTcwNSwiZXhwIjoyMDU3ODI3NzA1fQ.p3zTMoJmFNii-RpnDWwJc5Fm_pQUwBvVabEZ1EUGAZk"

# SQL to execute - simple test migration
$sql = @"
-- This is a direct test migration
-- It adds a comment to the products table and creates a simple index

-- Add a comment to the products table
COMMENT ON TABLE products IS 'Products available for purchase - updated March 21, 2025';

-- Add a simple index that definitely doesn't exist
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at);

-- Return success message
SELECT 'Migration successfully applied' as result;
"@

# Create the request body
$body = @{
    query_text = $sql
} | ConvertTo-Json

# Set up the headers
$headers = @{
    "Content-Type" = "application/json"
    "apikey" = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
}

Write-Host "Executing SQL migration..."

try {
    # Execute the SQL using the Supabase REST API
    $response = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/rpc/exec_sql" -Method POST -Headers $headers -Body $body
    
    Write-Host "Migration executed successfully!"
    Write-Host "Response:"
    $response | ConvertTo-Json
} catch {
    Write-Host "Error executing migration: $_"
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Status Description: $($_.Exception.Response.StatusDescription)"
    
    if ($_.ErrorDetails.Message) {
        Write-Host "Error Details: $($_.ErrorDetails.Message)"
    }
}
