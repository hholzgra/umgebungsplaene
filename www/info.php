<?php

$tmpdir=tempnam(sys_get_temp_dir(),'');
if (file_exists($tmpdir)) { unlink($tmpdir); }
mkdir($tmpdir);
chmod($tmpdir, 0777);

$data = json_decode($_REQUEST["data"], true);

switch($data["base_layer"]) {
  case "Humanitarian": $style = "Humanitarian";   break;
  case "HikeBikeMap":  $style = "HikeBikeMap";    break;
  case "OpenTopoMap":  $style = "OpenTopoMap";    break;
  case "German":       $style = "GermanCartoOSM"; break;
  case "French":       $style = "FrenchOSM";      break;
  default:             $style = "CartoOSM";       break;
}

$title = $data["title"];

$lat = $data["center_lat"];
$lon = $data["center_lon"];

$prefix = preg_replace('/[^a-z0-9]/i', '_', $title)."-".strftime("%F-%T");

$min_lat = $lat;
$min_lon = $lon;
$max_lat = $lat;
$max_lon = $lon;

foreach ($data["nodes"] as $folder) {
  foreach ($folder["nodes"] as $node) {
    $min_lat = min($min_lat, $node['lat']);  
    $min_lon = min($min_lon, $node['lon']);  
    $max_lat = max($max_lat, $node['lat']);  
    $max_lon = max($max_lon, $node['lon']);  
  }
}

file_put_contents("$tmpdir/poi_file.txt", $_REQUEST["data"]);

$d_lat = $max_lat - $min_lat;
$d_lon = $max_lon - $min_lon;

$min_lat -= $d_lat / 20;
$max_lat += $d_lat / 20;

$min_lon -= $d_lon / 20;
$max_lon += $d_lon / 20;

$cmd = "";
$cmd.= " /home/maposmatic/ocitysmap/render.py";
$cmd.= " --config=/vagrant/ocitysmap.conf";
$cmd.= sprintf(" --bounding-box=%.6f,%.6f %.6f,%.6f ", $min_lat, $min_lon, $max_lat, $max_lon);
$cmd.= " --title='$title'";
$cmd.= " --format=pdf";
$cmd.= " --prefix=$tmpdir/$prefix";
$cmd.= " --language=de_DE.utf8";
$cmd.= " --layout=single_page_index_side";
$cmd.= " --orientation=landscape";
$cmd.= " --paper-format=A1";
$cmd.= " --style=$style";
$cmd.= " --poi-file=$tmpdir/poi_file.txt";

file_put_contents("$tmpdir/cmdline.txt", $cmd);

chdir("/home/maposmatic/ocitysmap/");

system("sudo -u maposmatic $cmd > $tmpdir/out.log 2> $tmpdir/err.log", $status);

if ($status) {
  header('content-type: text/plain');
  echo "$cmd\n\n== stderr ==\n";
  readfile("$tmpdir/err.log");
  echo "\n\n== stdout ==\n";
  readfile("$tmpdir/out.log");
} else {
  header('Content-type: application/pdf');
  header('Content-Disposition: inline; filename="'.$prefix.'.pdf"');

  readfile("$tmpdir/$prefix.pdf");
}
