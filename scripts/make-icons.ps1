# Draws the app icons (PNG) into public/ with Windows' built-in System.Drawing, so no image
# tooling is needed as a dependency. Run from the repo root:
#   powershell -ExecutionPolicy Bypass -File scripts/make-icons.ps1
# Same look as public/favicon.svg: a white knight on the emerald accent (#059669).
Add-Type -AssemblyName System.Drawing

$out = Join-Path (Get-Location) 'public'
$green = [System.Drawing.Color]::FromArgb(255, 5, 150, 105)

function New-Icon([int]$size, [string]$name, [bool]$rounded, [double]$glyphScale) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.Clear([System.Drawing.Color]::Transparent)

  $brush = New-Object System.Drawing.SolidBrush $green
  if ($rounded) {
    # Rounded square like the favicon (radius = 22% of the side).
    $r = [int]($size * 0.22)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc(0, 0, 2 * $r, 2 * $r, 180, 90)
    $path.AddArc($size - 2 * $r, 0, 2 * $r, 2 * $r, 270, 90)
    $path.AddArc($size - 2 * $r, $size - 2 * $r, 2 * $r, 2 * $r, 0, 90)
    $path.AddArc(0, $size - 2 * $r, 2 * $r, 2 * $r, 90, 90)
    $path.CloseFigure()
    $g.FillPath($brush, $path)
  } else {
    # Full bleed: maskable and Apple icons are cropped by the system.
    $g.FillRectangle($brush, 0, 0, $size, $size)
  }

  $font = New-Object System.Drawing.Font('Segoe UI Symbol', [single]($size * $glyphScale), [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = 'Center'
  $format.LineAlignment = 'Center'
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  # The glyph sits a little high in its box; nudge it down.
  $rect = New-Object System.Drawing.RectangleF 0, ([single]($size * 0.04)), $size, $size
  $g.DrawString([string][char]0x265E, $font, $white, $rect, $format)

  $bmp.Save((Join-Path $out $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  Write-Output "wrote $name"
}

New-Icon 192 'pwa-192x192.png' $true 0.86
New-Icon 512 'pwa-512x512.png' $true 0.86
# Maskable: the glyph stays inside the 80% safe circle.
New-Icon 512 'maskable-512x512.png' $false 0.62
New-Icon 180 'apple-touch-icon.png' $false 0.76
