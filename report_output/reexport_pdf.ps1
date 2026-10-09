$DocPath = "D:\MWT_project\fuel-delivery-app\report_output\Smart_Fuel_Dispatch_Fleet_Telemetry_Final_Report.docx"
$PdfPath = "D:\MWT_project\fuel-delivery-app\report_output\Smart_Fuel_Dispatch_Fleet_Telemetry_Final_Report.pdf"

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = [Microsoft.Office.Interop.Word.WdAlertLevel]::wdAlertsNone

$doc = $word.Documents.Open($DocPath)
$doc.ExportAsFixedFormat($PdfPath, 17)
Write-Host "Re-exported PDF with updated TOC."

$doc.Close([Microsoft.Office.Interop.Word.WdSaveOptions]::wdDoNotSaveChanges)
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
