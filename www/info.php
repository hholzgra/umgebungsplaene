<?php

require_once 'HTTP/Request2.php';

$base_url = 'http://localhost/apis/';

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
// TODO: actually upload this once that feature is in place


$d_lat = $max_lat - $min_lat;
$d_lon = $max_lon - $min_lon;

$min_lat -= $d_lat / 20;
$max_lat += $d_lat / 20;

$min_lon -= $d_lon / 20;
$max_lon += $d_lon / 20;

$data = ['title'       => $title
	,'style'       => 'CartoOSM'
	,'layout'      => 'single_page_index_side'
	,'paper_size'  => 'Din A1'
	,'orientation' => 'landscape'
	,'bbox_top'    => $max_lat
	,'bbox_bottom' => $min_lat
	,'bbox_left'   => $min_lon
	,'bbox_right'  => $max_lon
        ];


$r = api_call($base_url."jobs/", $data, "$tmpdir/poi_file.txt");

header("Location: ".$r->interactive);









function api_call($url, $data = null, $file = null)
{
  $request = new HTTP_Request2($url);

  if ($data === null) {
          $request->setMethod(HTTP_Request2::METHOD_GET);
  } else {
        $body = json_encode($data);

        $request->setMethod(HTTP_Request2::METHOD_POST)
	        ->addPostParameter('job', $body);
	if($file !== null) {
		 $request->addUpload('poi_file', $file, basename($file), 'application/json');
	}
  }

  return json_decode($request->send()->getBody());
}

