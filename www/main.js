/* -------------------------------------------------------------------------------------------- */

// we are tracking map center position (for setting markers) in these
// start position for the map is set here, too
var center_lat = 52.0;
var center_lon = 8.5;

// the main map object
var map = false;

// all markers go into this layer so that we can get the marker bounds easily
var map_markers = false;

// simple rectangle that gets drawn around the marker bounds
var boundsRectangle = false;

// 
var new_marker = false;

// 
var center_marker = false;

// 
var drag_marker = false;

// set up the actual map
function mapInit()
{
    map = L.map('map', { scrollWheelZoom: "center",
			 doubleClickZoom: "center",
		       });
    
    var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    var osmAttrib='Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors';
    var osm = new L.TileLayer(osmUrl, {minZoom: 8, maxZoom: 18, attribution: osmAttrib});		
    
    map.setView(new L.LatLng(center_lat, center_lon), 12);
    map.addLayer(osm);

    // all markers get tracked in this feature group
    map_markers = L.featureGroup();
    map_markers.addTo(map);

    // search button
    map.addControl( new L.Control.Search({
	url: 'http://nominatim.openstreetmap.org/search?format=json&q={s}',
	jsonpParam: 'json_callback',
	propertyName: 'display_name',
	propertyLoc: ['lat','lon'],
	circleLocation: true,
	markerLocation: false,			
	autoType: false,
	autoCollapse: true,
	minLength: 2,
	zoom: 17
    }) );

    // info button - opens manual in new window
    L.easyButton('fa-info fa-lg',
		 function(btn, map) { window.open("map-doc/map-doc.html"); },
		 "about this tool"
		).addTo(map);
   
    // load/open button 
    L.easyButton('fa-folder-open-o fa-lg',
		 function(btn, map) { $('#loadfile').trigger('click');},
		 "load a map"
		).addTo(map);
   
    // POI wizzard button 
    L.easyButton('fa-magic fa-lg',
		 function(btn, map) { overpassImport(); },
		 "auto-generate POIs"
		).addTo(map);

    // re-zoom to marker bounds
    L.easyButton('fa-object-group fa-lg',
		 function(btn, map) { adjustBounds(true); },
		 "show all markers"
		).addTo(map);
   
    // save button 
    L.easyButton('fa-floppy-o fa-lg',
		 function(btn, map) { saveMap(); },
		 "save map"
		).addTo(map);

    // print button
    L.easyButton('fa-print fa-lg',
		 function(btn, map) { renderRequest(); },
		 "generate map PDF"
		).addTo(map);



    // on dragend: if we are editing something that has a marker: move that to map center
    map.on('dragend', function(e) {
        if (drag_marker) {
            var latlng = e.target.getCenter()
	    drag_marker.setLatLng(latlng);
            $("#form_lat").val((latlng.lat).toFixed(6));
            $("#form_lon").val((latlng.lng).toFixed(6));
        } 
    });

    map.on('drag', function(e) {
        if (drag_marker) {
            var latlng = e.target.getCenter()
	    drag_marker.setLatLng(latlng);
            $("#form_lat").val((latlng.lat).toFixed(6));
            $("#form_lon").val((latlng.lng).toFixed(6));
        } 
    });

    // on zoomend (only really needed on manual zoom): same as on dragend
    map.on('zoomend', function(e) {
        if (drag_marker) {
            var latlng = e.target.getCenter()
	    drag_marker.setLatLng(latlng);
            $("#form_lat").val((latlng.lat).toFixed(6));
            $("#form_lon").val((latlng.lng).toFixed(6));
        }
    });


    // set up special icon for the center marker
    var myIcon = L.icon({
	iconUrl: 'crosshair.png',
	shadowUrl: null,
	
	iconSize:     [32, 32], 
	iconAnchor:   [16, 16], 
    });

    // create center marker
    center_marker = L.marker([center_lat, center_lon],
			  {icon: myIcon,
			   title: "Center", // TODO: set dynamicly
			   draggable: false,
			   my_node: false,
			  }).addTo(map_markers);    

    // reopen the center form when center marker is clicked 
    // TODO: use double click instead?
    center_marker.on('click', function(e) {
	titleForm();
    });    


    // when the marker gets moved (only possible when the center form is open)
    // we need to update its lat/lon form fields    
    center_marker.on('move', function(e) {
	var latlng = e.target.getLatLng();

	$("#form_lat").val((latlng.lat).toFixed(6));
	$("#form_lon").val((latlng.lng).toFixed(6));
    });


    // same when the marker gets dragged
    center_marker.on('drag', function(e) {
	var latlng = e.target.getLatLng();

	$("#form_lat").val((latlng.lat).toFixed(6));
	$("#form_lon").val((latlng.lng).toFixed(6));
    });


    // on drag end we also need to re-center the map
    center_marker.on('dragend', function(e) {
	var latlng = e.target.getLatLng();

	$("#form_lat").val((latlng.lat).toFixed(6));
	$("#form_lon").val((latlng.lng).toFixed(6));

        map.panTo(latlng);
    });
     
}

// update the bounds rectangle that encloses all markers
function adjustBounds(withZoom)
{
    // remove previous rectangle if exists
    if (boundsRectangle !== false) {
	map.removeLayer(boundsRectangle);
    }
   
    // get current marker layer bounds 
    var b = map_markers.getBounds();

    // we add an extra 5% at each side as we don't want to have 
    // markers directly on the edge
    var d_lat = 0.05 * Math.abs(b.getNorth() - b.getSouth());
    var d_lon = 0.05 * Math.abs(b.getEast() - b.getWest());

    // generate new rectangle coordinats
    var southWest = L.latLng(b.getSouth() - d_lat * 0.05, b.getWest() - d_lon * 0.05);
    var northEast = L.latLng(b.getNorth() + d_lat * 0.05, b.getEast() + d_lon * 0.05);
    var new_b = L.latLngBounds(southWest, northEast);
    
    // create actual rectangle and put it on the map
    boundsRectangle = L.rectangle(new_b, {color: "#0000ff", weight: 1, fill: false});
    boundsRectangle.addTo(map);

    // if requested then also zoom in on the new bounds
    if (withZoom) {
	map.fitBounds(new_b);
    }
}


/* -------------------------------------------------------------------------------------------- */

// generate HTML for group entry in the tree
function groupTitle(name, color, icon)
{
    var html = "<span class='grouptitle' style='background-color: "+color+"'>";
    
    if (icon) {
	html += "<span class='fa fa-"+icon+"'></span> "
    }
    
    html += "<b>"+name+"</b>";
    
    html += "</span>";

    return html;
}


// add new grop to the tree
function groupAdd(tree, name, color, icon)
{
    var newGroup = tree.getRootNode().addNode(
	{ folder: true,
	  title: groupTitle(name, color, icon),
	  my_txt: name,
	  my_icon: icon,
	  my_color: color,
	}
    );
    
    tree.render();

    return newGroup;
}


// remove a group and all nodes under it
function groupDelete(group)
{
    // remove markers for all contained POI nodes
    group.visit( function (node) {
	map_markers.removeLayer(node.data.my_marker);
    });

    // as we removed POI markers we need to update the bounds rectangle
    adjustBounds();
   
    // remove actual node and all sub-nodes 
    group.remove();

    // remove group form if it was visible
    clearForm();

    return false;
}


// handle group form submisssion
function groupSubmit()
{
    // render group title for the tree view
    var html = groupTitle($("#form_name").val(), $("#form_color").val(), $("#form_icon").val());

    // try to find existing group node bound to the form
    var node = tree.getNodeByKey($("#form_key").val());

    if (node) {
        // update existing group
	node.data.my_txt   = $("#form_name").val();
	node.data.my_icon  = $("#form_icon").val();
	node.data.my_color = $("#form_color").val();
	node.setTitle(html);

        // update color on all related POI markers
	node.visit( function (node) {
	    node.data.my_marker.setIcon(L.MakiMarkers.icon({color: $("#form_color").val(), size: "m"}));
	});

        // set tree node inactive so that the user can activate it again
	node.setActive(false);
    } else {
        // create new group
	groupAdd(tree, $("#form_name").val(), $("#form_color").val(), $("#form_icon").val()); 
    }

    clearForm();

    return false;
}


// handle cancel button on group form
function groupCancel()
{
    clearForm();
    
    return false;
}


// handle trash button on group form
function groupTrash()
{
    var group_key = $("#form_key").val();
    var group = tree.getNodeByKey(group_key);

    return groupDelete(group);
}


// create and display group form
function groupForm(node)
{
    var html = "";
    var formTitle = "";
    var trash = "";
    
    clearForm();

    if (!node) {
	node = { key: "", data: {my_txt: "", my_color: "", my_icon: "",} ,};
	formTitle = "New group";
    } else {
	trash = `<span class='fa-stack fa-lg' onclick='groupTrash();' title='delete'>
	      <span class='fa fa-square fa-stack-2x'></span>
	      <span class='fa fa-trash  fa-stack-1x fa-inverse'></span>
            </span>`;

	formTitle = "Edit group";
    }
    
    html = `
	<form id='group_form' onsubmit='return groupSubmit();'>
	<input type='hidden' id='form_key' value='${node.key}'/>

	<div class='formhead'>${formTitle}</div>

     	<div class='formline'><label>Name:</label></div>
	<div class='formline'><input style='display: block; width: 100%;' type='text' id='form_name' value='${node.data.my_txt}'/></div>
	
     	<div class='formline'><label>Color:</label></div>
	<div class='formline'><input type='color' id='form_color' value='${node.data.my_color}'/></div>
	
	<div class='formline'><label>Icon:<label/></div>
	<div class='formline'>${iconOptions(node.data.my_icon)}</div>

	<div class='formbuttons'>
	  <span class='fa-stack fa-lg' onclick='$("#group_form").submit();' title='save'>
	    <span class='fa fa-square fa-stack-2x'></span>
	    <span class='fa fa-check  fa-stack-1x fa-inverse'></span>
          </span>
	  <span class='fa-stack fa-lg' onclick='groupCancel();' title='cancel'>
	    <span class='fa fa-square fa-stack-2x'></span>
	    <span class='fa fa-close  fa-stack-1x fa-inverse'></span>
          </span>
	  ${trash}
	</div>    
</form>`;

    $("#form").html(html);
    $("#form_icon").selectpicker();
    $("#sidetree").hide();
    $("#form").show();
}

/* -------------------------------------------------------------------------------------------- */

function poiTitle(name, icon)
{
    var html = "<span>";
    
    if (icon) {
	html += "&nbsp;&nbsp;&nbsp;<span class='fa fa-"+icon+"'></span>&nbsp;&nbsp;"
    }
    
    html += name;
    
    html += "</span>";

    return html;
}


function poiAdd(tree, group, name, icon, lat, lon)
{
    if (typeof group === "string") {
	group = tree.getNodeByKey(group);
    }

    var node = group.addNode({folder: false,
			      icon: false,
			      title: poiTitle(name, icon),
			      my_txt: name,
			      my_icon: icon,
			      my_lat: lat,
			      my_lon: lon,
			      my_marker: false,
			     });

    node.makeVisible();
    var markerIcon = L.MakiMarkers.icon({color: group.data.my_color,
					 size: "m",
					});
    var marker = L.marker([lat, lon], {icon: markerIcon,
				       title: name,
				       draggable: false,
				       my_node: node,
				      });
    // when the marker gets moved (only possible when the center form is open)
    // we need to update its lat/lon form fields    
    marker.on('move', function(e) {
	var latlng = e.target.getLatLng();

	$("#form_lat").val((latlng.lat).toFixed(6));
	$("#form_lon").val((latlng.lng).toFixed(6));
    });

    marker.on('click', function(e) {
	this.options.my_node.makeVisible();
	this.options.my_node.setActive();
    });    
    marker.on('drag', function(e) {
	var latlng = e.target.getLatLng();

	$("#form_lat").val((latlng.lat).toFixed(6));
	$("#form_lon").val((latlng.lng).toFixed(6));
    });
    marker.on('dragend', function(e) {
	var latlng = e.target.getLatLng();

	$("#form_lat").val((latlng.lat).toFixed(6));
	$("#form_lon").val((latlng.lng).toFixed(6));

        map.panTo(latlng);
     });

    map_markers.addLayer(marker);
    
    node.data.my_marker = marker; 

    adjustBounds(false);
    tree.render();
}


function poiSubmit()
{
    var node_key = $("#form_key").val();
    var name     = $("#form_name").val();
    var icon     = $("#form_icon").val();
    var lat      = $("#form_lat").val();
    var lon      = $("#form_lon").val();

    var node = tree.getNodeByKey(node_key);

    if (node.isFolder()) {
	map.removeLayer(new_marker);
	drag_marker = false;
	new_marker = false;
	poiAdd(tree, node.key, name, icon, lat, lon);
    } else {
	node.data.my_txt  = name;
	node.data.my_icon = icon;
	node.data.my_lat  = lat;
	node.data.my_lon  = lon;
	node.data.my_marker.setLatLng([lat, lon]);
	node.setTitle(poiTitle(name, icon));
	node.makeVisible();
	adjustBounds();
    }

    clearForm();
    
    return false;
}

function poiCancel()
{
    map.removeLayer(new_marker);
    drag_marker = false;
    new_marker = false;

    clearForm();

    return false;
}

function poiTrash()
{
    var node_key = $("#form_key").val();
    var node = tree.getNodeByKey(node_key);

    clearForm();
    
    return poiDelete(node);
}

function poiDelete(node)
{
    map_markers.removeLayer(node.data.my_marker);
    adjustBounds(false);

    node.remove();

    return false;
}

function poiForm(node)
{
    var html = "";
    var formTitle = "";
    var trash = "";
    
    var key = node.key;

    clearForm();

    if (node.isFolder()) {
	var ll = map.getCenter();
	
	new_marker = L.marker([ll.lat, ll.lng],
			      {icon: L.MakiMarkers.icon({icon: "circle",
							 color: node.data.my_color,
							 size: "l"}),
			       title: name,
			       draggable: true,
			      });

	drag_marker = new_marker;

        // when the marker gets moved (only possible when the center form is open)
        // we need to update its lat/lon form fields    
        new_marker.on('move', function(e) {
            var latlng = e.target.getLatLng();

            $("#form_lat").val((latlng.lat).toFixed(6));
            $("#form_lon").val((latlng.lng).toFixed(6));
        });

	new_marker.on('drag', function(e) {
	    var latlng = e.target.getLatLng();
	    
	    $("#form_lat").val((latlng.lat).toFixed(6));
	    $("#form_lon").val((latlng.lng).toFixed(6));
	});
	
	new_marker.on('dragend', function(e) {
	    var latlng = e.target.getLatLng();
	    
	    $("#form_lat").val((latlng.lat).toFixed(6));
	    $("#form_lon").val((latlng.lng).toFixed(6));

            map.panTo(latlng);
	});

	map.addLayer(new_marker);
	
	node = { data: { my_txt:  "",
			 my_icon: node.data.my_icon,
			 my_lat:  (ll.lat).toFixed(6),
			 my_lon:  (ll.lng).toFixed(6),
		       },
	       };

	formTitle = "New node";
    } else {
	map.setView([node.data.my_lat, node.data.my_lon]);
	
	trash = `<span class='fa-stack fa-lg' onclick='poiTrash();' title='delete'>
	      <span class='fa fa-square fa-stack-2x'></span>
	      <span class='fa fa-trash  fa-stack-1x fa-inverse'></span>
            </span>`;

	node.data.my_marker.setIcon(L.MakiMarkers.icon({icon: 'circle', color: node.parent.data.my_color, size: "l"}));
	drag_marker = node.data.my_marker;
	drag_marker.dragging.enable();
	    
	formTitle = "Edit node";
    }
    
    html = `<form id='node_form' onsubmit='return poiSubmit();'><input type='hidden' id='form_key' value='${key}'/>
	<div class='formhead'>${formTitle}</div>
	
 	<div class='formline'><label>Name:</label></div>
	<div class='formline'><input style='display: block; width: 100%;' type='text' id='form_name' value='${node.data.my_txt}'/></div>
	
	<div class='formline'><label>Icon:<label/></div>
	<div class='formline'>${iconOptions(node.data.my_icon)}</div>
	
	<div class='formline'><label>Lat / Lon:</label></div>
	<div style='width: 100%; text-align: center;'>
	  <input class='readonly latlon' type='text' readonly='' type='text' id='form_lat' value='${node.data.my_lat}'/> 
	  <input class='readonly latlon' type='text' readonly='' type='text' id='form_lon' value='${node.data.my_lon}'/>
	</div>
	<div class='formbuttons'>
	  <span class='fa-stack fa-lg' onclick='$("#node_form").submit();' title='save'>
	    <span class='fa fa-square fa-stack-2x'></span>
	    <span class='fa fa-check  fa-stack-1x fa-inverse'></span>
          </span>
	  <span class='fa-stack fa-lg' onclick='poiCancel();' title='cancel'>
	    <span class='fa fa-square fa-stack-2x'></span>
	    <span class='fa fa-close  fa-stack-1x fa-inverse'></span>
          </span>
	  ${trash}
	</div>
</form>`;

    $("#form").html(html);
    $("#form_icon").selectpicker();
    $("#sidetree").hide();
    $("#form").show();
}

/* -------------------------------------------------------------------------------------------- */

function titleSubmit()
{
    $("#side_title").html($("#form_name").val());

    center_lat = parseFloat($("#form_lat").val()).toFixed(6);
    center_lon = parseFloat($("#form_lon").val()).toFixed(6);
    adjustBounds();
    
    clearForm();
    
    return false;
}

function titleCancel()
{
    drag_marker = false;
    center_marker.dragging.disable();    
    center_marker.setLatLng([center_lat, center_lon]);
    
    clearForm();

    return false;
}


function titleForm()
{
    var title = $("#side_title").html();
    
    clearForm();
    
    html=`<form id='center_form' onsubmit='return titleSubmit();'>
	<div class='formhead'>Standort</div>
	
 	<div class='formline'><label>Name:</label></div>
	<div class='formline'><input style='display: block; width: 100%;' type='text' id='form_name' value='${title}'/></div>
	
	<div class='formline'><label>Lat / Lon:</label></div>
	<div style='width: 100%; text-align: center;'>
	  <input class='latlon readonly' readonly="" type='text' id='form_lat' value='${center_lat}'/> 
	  <input class='latlon readonly' readonly="" type='text' id='form_lon' value='${center_lon}'/>
	</div>

	<div class='formbuttons'>
	  <span class='fa-stack fa-lg' onclick='$("#center_form").submit();' title='save'>
	    <span class='fa fa-square fa-stack-2x'></span>
	    <span class='fa fa-check  fa-stack-1x fa-inverse'></span>
          </span>
	  <span class='fa-stack fa-lg' onclick='titleCancel();' title='cancel'>
	    <span class='fa fa-square fa-stack-2x'></span>
	    <span class='fa fa-close  fa-stack-1x fa-inverse'></span>
          </span>
	</div>
      </form>`;
    $("#form").html(html);
    $("#sidetree").hide();
    $("#form").show();

    drag_marker = center_marker;
    center_marker.dragging.enable();    
 }

/* -------------------------------------------------------------------------------------------- */

// selectable icons and their captions
function iconOptions(default_icon)
{
    var icons = [ { name: "Einkaufen",
                    icons: [
	["shopping-basket", "Einkaufen"],
	["shopping-cart",   "Supermarkt"],
	["percent",         "Discounter"],
] }, { name: "Nahverkehr", icons: [
	["bus",             "Bus"],
	["taxi",            "Taxi"],
	["subway",          "Straßen- / U-Bahn"],
	["train",           "Eisenbahn"],
] }, { name: "Gesundheit", icons: [
	["user-md",         "Arzt"],
	["hospital-o",      "Krankenhaus"],
	["medkit",          "Apotheke"],
] }, { name: "Religion", icons: [
	["plus-square",     "Kirche"],
	["moon-o",          "Moschee"],
] }, { name: "Essen & Trinken", icons: [
	["coffee",          "Cafe"],
	["cutlery",         "Restaurant"],
] }, { name: "Verschiedenes", icons: [
	["book",            "Bücherei"],
	["envelope-o",      "Post"],
	["film",            "Kino"],
	["graduation-cap",  "Schule"],
	["bed",             "Unterkunft"],
	["info",            "Information"],
	["music",           "Musik"],
	["phone",           "Telefon"],
	["soccer-ball-o",   "Sport"],
	["bicycle",         "Fahrrad"],
	["car",             "Auto"],
	["money",           "Bank"],
    ]}];

    var html = "<select id='form_icon'>";
    for (var i in icons) {
	var icongroup = icons[i];

        html += `<optgroup label='${icongroup['name']}'>\n`;

        for (var j in icongroup.icons) {
          var icon = icongroup.icons[j][0];
	  var label = icongroup.icons[j][1];
	  var selected = icon == default_icon ? "selected" : "";

          html += `<option value="${icon}" ${selected} data-content="<span class='fa fa-${icon}'>&nbsp;&nbsp;${label}</span>">${label}</option>`;
        }

        html += "</optgroup>\n";
    }
    html += "</select>";
    return html;
}

/* -------------------------------------------------------------------------------------------- */

function exportData()
{
    var data = "";
    
    tree.visit( function (node) {
	if (node.isFolder()) {
	    data += `${node.data.my_txt};${node.data.my_color};${node.data.my_icon}\n`;
	} else {
	    data +=`  ${node.data.my_txt};${node.data.my_lat},${node.data.my_lon};${node.data.my_icon}\n`;
	}
    });

    return data;
}


function exportJSON()
{
    var exportData = {
	title: $("#side_title").html(),
	center_lat: center_lat,
	center_lon: center_lon,
	nodes: [],
    };
    
    for (var folder_id in tree.rootNode.children) {

	var folder = tree.rootNode.children[folder_id];
	
	var currentFolder = {
	    text:  folder.data.my_txt,
	    color: folder.data.my_color,
	    icon:  folder.data.my_icon,
	    nodes: [],
	};

	for (var node_id in folder.children) {
	    var node = folder.children[node_id];
	    
	    currentFolder.nodes.push(
		{
		    text: node.data.my_txt,
		    icon: node.data.my_icon,
		    lat:  node.data.my_lat,
		    lon:  node.data.my_lon,
		}
	    );
	};
	
	exportData.nodes.push(currentFolder);
    };

    return JSON.stringify(exportData, null, 4);
}


function importJSON(jsonStr)
{
    try {
       jsonData = JSON.parse(jsonStr);
    } catch (e) {
       alert("Invalid file format");
    }

    // TODO add more checks
    
    tree.clear();

    $("#side_title").html(jsonData.title);
    center_lat = jsonData.center_lat;
    center_lon = jsonData.center_lon;
    center_marker.setLatLng([center_lat, center_lon]);
       
    for (var key in jsonData.nodes) {
	var newGroup = groupAdd(
	    tree,
	    jsonData.nodes[key].text,
	    jsonData.nodes[key].color,
	    jsonData.nodes[key].icon
	);

	for (var key2 in jsonData.nodes[key].nodes) {
	    poiAdd(tree,
		   newGroup,
		   jsonData.nodes[key].nodes[key2].text,
		   jsonData.nodes[key].nodes[key2].icon,
		   parseFloat(jsonData.nodes[key].nodes[key2].lat).toFixed(6),
		   parseFloat(jsonData.nodes[key].nodes[key2].lon).toFixed(6)
		  );
	}
    }

    adjustBounds(true);
}

/* -------------------------------------------------------------------------------------------- */

var tree = false;
var firstNode = false;

function treeInit()
{
    $("#tree").fancytree({debugLevel: 0,
			  activate: function(event, data) {
			      if (!data.node.isFolder()) {
				  poiForm(data.node);
			      } else {
				  groupForm(data.node);
			      }
			  },
			  extensions: ["dnd"],
			  dnd: {
			      dragStart: function(node, data) {
				  return true;
			      },
			      dragEnter: function(node, data) {
				  var mode = false;
				  if (node === firstNode) return false;
				  if (data.otherNode === firstNode) return false;
				  if (node.folder == data.otherNode.folder) {				      
				      mode = ["before", "after"];
				  } else if (!data.otherNode.folder && node.folder) {
				      mode = true;
				  }
				  return mode;
			      },
			      dragDrop: function(node, data) {
				  data.otherNode.moveTo(node, data.hitMode);
				  data.otherNode.data.my_marker.setIcon(L.MakiMarkers.icon({color: node.data.my_color, size: "m"}));
			      },
			  }
			 });      
    
    
    $("#tree").contextmenu({
	delegate: "span.fancytree-title",
	menu: [
            {title: "Delete",       cmd: "del", uiIcon: "ui-icon-trash"},
	    {title: "Add&nbsp;POI", cmd: "add", uiIcon: "ui-icon-plusthick"},
       ],
	beforeOpen: function(event, ui) {
            var node = $.ui.fancytree.getNode(ui.target);
	},
	select: function(event, ui) {
            var node = $.ui.fancytree.getNode(ui.target);
	    switch (ui.cmd) {
	    case "add":
		if (node.isFolder()) {
		    poiForm(node);
		} else {
		    poiForm(node.parent);
		}
		break;
	    case "del":
		if (confirm("wirklich löschen?")) {
		    if (node.isFolder()) {
			groupDelete(node);
		    } else {
			poiDelete(node);
		    }
		}
		break;
	    }
	},
    });
    
    tree = $("#tree").fancytree("getTree");
    
    tree.render();
}

/* -------------------------------------------------------------------------------------------- */

function renderRequest()
{
    $("#hidden_data").val(exportJSON());
    $("#hidden_form").submit();
}

/* -------------------------------------------------------------------------------------------- */

function overpassQuery(query)
{
    var b = map.getBounds();
    
    var bb = "%28"+b.getSouth()+","+b.getWest()+","+b.getNorth()+","+b.getEast()+"%29";
    
    var url = "";
    
    url += "http://overpass-api.de/api/interpreter?data=[out:json][timeout:25];%28";
    url += "node"+query+bb+";"
    url += "way"+query+bb+";"
    url += "relation"+query+bb+";"
    url += "%29;out%20center;";

    console.log(query);
    console.log(url);
    
    return url;
}

function importNodes(group, query, icon)
{
    $.getJSON(overpassQuery(query),
	      function(data) {
		  console.log(data);
		  $.each(data.elements, function(key, val) {
		      var lat, lon;
		      if ('center' in val) {
			  lat = val.center.lat;
			  lon = val.center.lon;
		      } else {
			  lat = val.lat;
			  lon = val.lon;
		      }
		      poiAdd(tree, group, val.tags.name, icon, lat, lon);
		  } );
	      } );
}

function overpassImport()
{
    var group = false;

    group = groupAdd(tree, "Einkauf", "#00ff00", "shopping-cart");
    importNodes(group, '["shop"="supermarket"]', "shopping-cart");

    group = groupAdd(tree, "Gesundheit", "#ff0000", "medkit");
    importNodes(group, '["amenity"="hospital"]', "hospital-o");
    importNodes(group, '["amenity"="pharmacy"]', "medkit");

    group = groupAdd(tree, "Religion", "#7f7f7f", "plus-square");
    importNodes(group, '["amenity"="place_of_worship"]["denomination"="protestant"]', "plus-square");
    importNodes(group, '["amenity"="place_of_worship"]["denomination"="catholic"]', "plus-square");
    importNodes(group, '["amenity"="place_of_worship"]["religion"="muslim"]', "moon-o");
}

/* -------------------------------------------------------------------------------------------- */

function saveMap()
{
    var blob = new Blob([exportJSON()], {type: "text/plain;charset=utf-8"});
    saveAs(blob, sanitizeFilename($("#side_title").html())+".map");
}

/* -------------------------------------------------------------------------------------------- */

function clearForm()
{
    $("#form").hide();
    $("#sidetree").show();

    var node_key = $("#form_key").val();

    var node = tree.getNodeByKey(node_key);

    if (drag_marker) {
	drag_marker.dragging.disable();
        drag_marker = false;
    }

    if (!node) {
	if (new_marker !== false) {
	    map.removeLayer(new_marker);
	    new_marker = false;
	}
    } else {    
	node.setActive(false);

	if ( !node.isFolder() ) {
	    node.data.my_marker.setLatLng([node.data.my_lat, node.data.my_lon]);
	    node.data.my_marker.setIcon(L.MakiMarkers.icon({color: node.parent.data.my_color, size: "m"}));
	}
    }

    $("#form").html("");
}

/* -------------------------------------------------------------------------------------------- */

function FileLoad(evt)
{
    var f = evt.target.files[0]; 
    
    if (f) {
	var r = new FileReader();
	r.onload = function(e) { 
	    var contents = e.target.result;
	    importJSON(contents);
	}
	r.readAsText(f);
    } else { 
	alert("Failed to load file");
    }}

/* -------------------------------------------------------------------------------------------- */

function sanitizeFilename(name)
{
    var filename = name.replace(/[^a-z0-9]/gi, '_');
    
    return filename;
}

/* -------------------------------------------------------------------------------------------- */

$(function() {
    $("#map").height(window.innerHeight);
    $(window).resize(function() {
	$("#map").height(window.innerHeight);
    });
		     
    mapInit();
    treeInit();

    titleForm();
});


