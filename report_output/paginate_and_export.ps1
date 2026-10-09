param(
    [string]$DocPath = "D:\MWT_project\fuel-delivery-app\report_output\Smart_Fuel_Dispatch_Fleet_Telemetry_Final_Report.docx",
    [string]$PdfPath = "D:\MWT_project\fuel-delivery-app\report_output\Smart_Fuel_Dispatch_Fleet_Telemetry_Final_Report.pdf"
)

$word = $null
try {
    Write-Host "Opening Microsoft Word..."
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = [Microsoft.Office.Interop.Word.WdAlertLevel]::wdAlertsNone

    Write-Host "Opening Document: $DocPath"
    $doc = $word.Documents.Open($DocPath)

    # Repaginate and update fields
    Write-Host "Repaginating document..."
    $doc.Repaginate()
    
    $totalPages = $doc.ComputeStatistics([Microsoft.Office.Interop.Word.WdStatistic]::wdStatisticPages)
    Write-Host "Total Document Pages: $totalPages"

    # Search for chapter page numbers
    $chapters = @(
        @{ Num="1"; Name="CHAPTER 1" },
        @{ Num="2"; Name="CHAPTER 2" },
        @{ Num="3"; Name="CHAPTER 3" },
        @{ Num="4"; Name="CHAPTER 4" },
        @{ Num="5"; Name="CHAPTER 5" },
        @{ Num="6"; Name="CHAPTER 6" },
        @{ Num="7"; Name="CHAPTER 7" },
        @{ Num="8"; Name="CHAPTER 8" },
        @{ Num="9"; Name="CHAPTER 9" },
        @{ Num="Ref"; Name="REFERENCES" }
    )

    $pageMap = @{}

    foreach ($ch in $chapters) {
        $find = $doc.Content.Find
        $find.ClearFormatting()
        $find.Text = $ch.Name
        $find.MatchCase = $true
        $find.MatchWholeWord = $false
        
        if ($find.Execute()) {
            $range = $find.Parent
            $pageNum = $range.Information([Microsoft.Office.Interop.Word.WdInformation]::wdActiveEndAdjustedPageNumber)
            $pageMap[$ch.Num] = $pageNum
            Write-Host "$($ch.Name) found at Page: $pageNum"
        } else {
            Write-Host "$($ch.Name) NOT found!"
        }
    }

    # Find Table of Contents table (first table in Section 1 or document)
    Write-Host "Updating Table of Contents table..."
    if ($doc.Tables.Count -ge 1) {
        $tocTable = $doc.Tables.Item(1)
        Write-Host "TOC Table rows: $($tocTable.Rows.Count)"
        
        # Row 2 is CH 1, Row 3 is CH 2, ... Row 10 is CH 9, Row 11 is References
        $rowToCh = @{
            2 = "1"
            3 = "2"
            4 = "3"
            5 = "4"
            6 = "5"
            7 = "6"
            8 = "7"
            9 = "8"
            10 = "9"
            11 = "Ref"
        }

        foreach ($rowIdx in $rowToCh.Keys) {
            $chKey = $rowToCh[$rowIdx]
            if ($pageMap.ContainsKey($chKey) -and $rowIdx -le $tocTable.Rows.Count) {
                $pNum = $pageMap[$chKey]
                $cell = $tocTable.Cell($rowIdx, 3)
                $cell.Range.Text = "$pNum"
                Write-Host "Set TOC Row $rowIdx to Page $pNum"
            }
        }
    }

    # Repaginate again after TOC update
    $doc.Repaginate()
    $finalPages = $doc.ComputeStatistics([Microsoft.Office.Interop.Word.WdStatistic]::wdStatisticPages)
    Write-Host "Final Total Pages: $finalPages"

    # Save DOCX
    Write-Host "Saving updated DOCX..."
    $doc.Save()

    # Export to PDF (17 = wdExportFormatPDF)
    Write-Host "Exporting to PDF: $PdfPath"
    $doc.ExportAsFixedFormat($PdfPath, 17)
    Write-Host "PDF Export complete!"

    $doc.Close([Microsoft.Office.Interop.Word.WdSaveOptions]::wdSaveChanges)
} catch {
    Write-Host "Error occurred: $_"
} finally {
    if ($word -ne $null) {
        $word.Quit()
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
    }
}
