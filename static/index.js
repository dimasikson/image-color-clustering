
// #################### global constants & variables #################

var SUBMIT_IMG_BYPASS = true;

// consts from styles.css
const fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--main-font-family');
const mainWidth = getComputedStyle(document.documentElement).getPropertyValue('--main-width');

const plotMargin = 0;
const plotMargin3D = 0;

// changes if device == mobile

const contentMargin = getComputedStyle(document.documentElement).getPropertyValue('--content-margin');
const windowMaxWidth = window.innerWidth - contentMargin*2;

const plotWidth = Math.min(mainWidth,windowMaxWidth);
const plotHeight = getComputedStyle(document.documentElement).getPropertyValue('--plot-height');
const plotHeightBar = getComputedStyle(document.documentElement).getPropertyValue('--plot-height-bar');

const maxImgWidth = Math.min(mainWidth,windowMaxWidth);
const maxImgHeight = 400;

const dim = 100;
const approxPixelCount = dim ** 2;

// initiate outside of function
var dataURL;

// #################### image functions #################

function displayImg() {

    var imgs = document.getElementById('imageSelect');

    if (imgs.files.length >= 1) {

        // img scaling to display, based on maxWidth and maxHeight
        var imgToDisplay = new Image();
        imgSlotToDisplay = document.getElementById('imgToDisplay');
        imgSlotToDisplay.src = window.URL.createObjectURL(imgs.files[0]);
        imgToDisplay.src = imgSlotToDisplay.src;

        var canvasWidth;
        var canvasHeight;

        imgToDisplay.onload = function () {

            var w = this.width;
            var h = this.height;

            var scaleWidth = w / maxImgWidth;
            var scaleHeight = h / maxImgHeight;
            var maxScale = 1 / Math.max(scaleHeight, scaleWidth);

            imgSlotToDisplay.width = w * maxScale;
            imgSlotToDisplay.height = h * maxScale;
            
            // scale image to send based on area
            var areaScale = dim / ((w * h) ** 0.5);
            canvasWidth = Math.round( w * areaScale );
            canvasHeight = Math.round( h * areaScale );

            // create empty canvas of dimensions
            var canvas = document.createElement("canvas");
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;

            // draw on canvas
            var ctx = canvas.getContext("2d");
            ctx.drawImage(this, 0, 0, canvasWidth, canvasHeight);
            
            // convert to base64
            dataURL = canvas.toDataURL();

            // display only the img to display element
            $('#imgToDisplay').show();

            selectAlgorithmChange();
            $('#buttonDashboard').show();

        };

    } else {

        $('#imgToDisplay').hide();
        $('#buttonDashboard').hide();

    };

    $('#chartArea3D').hide();
    $('#chartAreaColorBar').hide();

};

// #################### request functions #################

document.getElementById('mainSubmitButton').addEventListener('click', () => {

    var formData = new FormData();
    var imgs = document.getElementById('imageSelect');
    
    // Check file selected or not && if another request isn't running
    if(imgs.files.length >= 1 && SUBMIT_IMG_BYPASS){

        formData.append('uri', dataURL);
        var paramsObj = selectAllParameters();

        for (k in paramsObj){
            var v = paramsObj[k];
            formData.append(k, v);
        };

        // block more requests until the origin request returns
        SUBMIT_IMG_BYPASS = false;

        $.ajax({
            url: '/submit',
            type: 'post',
            data: formData,
            contentType: false,
            processData: false,
            success: function(response){

                // unblock requests in case of success
                SUBMIT_IMG_BYPASS = true;
                fetchedOutput = JSON.parse(response);

                $('#chartArea3D').hide();
                $('#chartAreaColorBar').hide();

                // plots
                make3DPlot(fetchedOutput, 'chartArea3D', paramsObj)
                makeBarPlot(fetchedOutput, 'chartAreaColorBar', paramsObj)
            
            },    
            error: function(error){
                
                // unblock requests in case of failure
                SUBMIT_IMG_BYPASS = true;
                
                $('#submitErrorMsg').show();
                setTimeout(() => {$('#submitErrorMsg').slideUp()}, 3000);
    
            },
        });

    };

});

function findOptK() {

    var formData = new FormData();
    var imgs = document.getElementById('imageSelect');
    
    // Check file selected or not && if another request isn't running
    if(imgs.files.length >= 1){

        formData.append('uri', dataURL);

        $.ajax({
            url: '/find_k',
            type: 'post',
            data: formData,
            contentType: false,
            processData: false,
            success: function(response){
                k = JSON.parse(response)["k"];

                // check if current algo name is still kmeans
                var paramsObj = selectAllParameters();
                if (paramsObj["algo_name"] == "km") { suggestOptK(k) };
            },    
        });

    };

};

function selectAllParameters() {

    var output = {};
    output["algo_params"] = [];
    var textSpans = document.querySelectorAll('[id^="sliderTextSpan:"]');

    textSpans.forEach(
        function(currentValue) {

            var paramName = currentValue.innerHTML.split(": ")[0];
            var paramVal = currentValue.innerHTML.split(": ")[1];
            output["algo_params"].push([paramName, paramVal]);

        },
    );

    var algoName = document.getElementById("algorithmSelect").value;
    output["algo_name"] = algoName;

    return output;

};

// ###################### sliders ###################### 

function range(start, end) {
	var len = end - start + 1;
	var a = new Array(len);
	for (let i = 0; i < len; i++) a[i] = start + i;
	return a;
}

const algorithmParameters = {
    'km' : {
        'n_clusters': range(1, 30),
    },
    'hdb' : {
        'min_cluster_size': [approxPixelCount / 1000, approxPixelCount / 500, approxPixelCount / 200, approxPixelCount / 100],
        'min_samples': [approxPixelCount / 2000, approxPixelCount / 1000, approxPixelCount / 500, approxPixelCount / 200],
    },
    'opt' : {
        'min_samples': [approxPixelCount / 2000, approxPixelCount / 1000, approxPixelCount / 500, approxPixelCount / 200, approxPixelCount / 100],
        'max_eps': [0.05, 0.1, 0.2, 0.5],
    },
    'orig': {},
};

function selectAlgorithmChange() {

    var algoName = document.getElementById("algorithmSelect").value;
    var params = algorithmParameters[algoName];

    var parentDiv = document.getElementById("algorithmParameters");
    parentDiv.innerHTML = "";

    for (paramName in params){

        var paramValues = params[paramName];
        var sliderDiv = document.createElement("div");
        var sliderTextSpan = document.createElement("span");
        var childSlider = document.createElement("input");

        sliderDiv.style.marginTop = "5px";
        sliderDiv.style.display = "flex";
        sliderDiv.style.alignItems = "center";
        sliderDiv.name = "sliderDiv:" + algoName + ":" + paramName;
        sliderDiv.id = sliderDiv.name;

        childSlider.type = "range";
        childSlider.min = 0;
        childSlider.max = paramValues.length - 1;
        childSlider.style.width = "200px";
        childSlider.value = parseInt(paramValues.length * 0.5);
        childSlider.step = 1;
        childSlider.name = "slider:" + algoName + ":" + paramName;
        childSlider.id = childSlider.name;
        
        sliderTextSpan.innerHTML = paramName + ": " + algorithmParameters[algoName][paramName][childSlider.value];
        sliderTextSpan.style.marginLeft = "5px";
        sliderTextSpan.style.verticalAlign = "middle";
        sliderTextSpan.name = "sliderTextSpan:" + algoName + ":" + paramName;
        sliderTextSpan.id = sliderTextSpan.name;

        childSlider.addEventListener('input', updateSliderDisplayEvent);
        childSlider.addEventListener('change', updateSliderDisplayEvent);

        sliderDiv.appendChild(childSlider);
        sliderDiv.appendChild(sliderTextSpan);
        parentDiv.appendChild(sliderDiv);

        updateSliderDisplay(childSlider);
        
    };

    // clear tooltips below the sliders
    document.getElementById("mainTooltips").innerHTML = "";

    // find & suggest optimal K, the function is async
    if (algoName == "km"){ findOptK() }
    
};    

function updateSliderDisplay(sld) {

    var idx = sld.value;
    var algoName = sld.name.split(':')[1];
    var paramName = sld.name.split(':')[2];
    
    var paramValue = algorithmParameters[algoName][paramName][idx];
    var sliderTextSpan = document.getElementById("sliderTextSpan:" + algoName + ":" + paramName);
    
    sliderTextSpan.innerHTML = paramName + ": " + paramValue;
    
};

function updateSliderDisplayEvent(e) {

    updateSliderDisplay(e.srcElement);

};

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
};

function sumArray(ar) {
    return ar.reduce((a, b) => a + b, 0);
};

// #######################    tooltips    ##################################

function suggestOptK(k) {

    var optKElement = document.createElement("span");
    optKElement.innerHTML = "suggested n_clusters = " + k;
    optKElement.classList.add('toolTip');

    // append the tooltip element
    document.getElementById("mainTooltips").appendChild(optKElement);

};

// #######################    plots    ##################################

function make3DPlot(data, targetDiv, paramsObj){

    var traces = [];

    var arrayR = data["r"];
    var arrayG = data["g"];
    var arrayB = data["b"];
    var arrayCluster = data["cluster"];

    var clusters = {};
    var clusterValues = arrayCluster.filter(onlyUnique);

    for (var i in clusterValues){

        var clusterOpacity = 0.9
        if (clusterValues[i] == -1) {
            clusterOpacity = 0.01
        }

        clusters[clusterValues[i]] = {
            x: [], 
            y: [], 
            z: [],
            mode: 'markers',
            marker: {
                line: {
                    width: 0,
                },
                color: "black",
                opacity: clusterOpacity
            },
            type: 'scatter3d',
            name:  clusterValues[i],
            // this key is unused, it's only needed for displaying the original image. Unused keys don't break the plot function
            marker_color_array: [],
        };
    };

    for (var i = 0; i < arrayCluster.length; i++){

        var c = arrayCluster[i];
        var r = arrayR[i];
        var g = arrayG[i];
        var b = arrayB[i];

        clusters[c]["x"].push(r);
        clusters[c]["y"].push(g);
        clusters[c]["z"].push(b);
        clusters[c]["marker_color_array"].push([r, g, b]);

    };

    for (var c in clusters){

        var cluster = clusters[c];

        if (c >= 0) {
          
            var r_mean = parseInt( sumArray(cluster["x"]) / cluster["x"].length )
            var g_mean = parseInt( sumArray(cluster["y"]) / cluster["y"].length )
            var b_mean = parseInt( sumArray(cluster["z"]) / cluster["z"].length )  
          
            // if not original image, display means, else display the full array
            clusters[c]["marker"]["color"] = paramsObj["algo_name"] != "orig" ? "rgb(" + r_mean + "," + g_mean + "," + b_mean + ")" : clusters[c]["marker_color_array"];
            traces.push(cluster);
        
        };
    };

    var layout = {
        width: plotWidth,
        height: plotHeight,
        margin: {
            l: plotMargin3D,
            r: plotMargin3D,
            b: plotMargin3D,
            t: plotMargin3D
        },
        scene: {
            xaxis:{title: "R"},
            yaxis:{title: "G"},
            zaxis:{title: "B"}
        },
        showlegend: false,
    };

    Plotly.newPlot(targetDiv, traces, layout, {displayModeBar: false});
    $('#chartArea3D').show();

};
function makeBarPlot(data, targetDiv, paramsObj){

    // early exit if displaying original image
    if (paramsObj["algo_name"] == "orig") {return}

    var traces = [];

    var arrayR = data["r"];
    var arrayG = data["g"];
    var arrayB = data["b"];
    var arrayCluster = data["cluster"];

    var clusters = {};
    var clusterColors = {};
    var clusterValues = arrayCluster.filter(onlyUnique);

    for (var i in clusterValues){

        var clusterOpacity = 0.9
        if (clusterValues[i] == -1) {
            clusterOpacity = 0.01
        }

        clusters[clusterValues[i]] = {
            x: [0], 
            y: ['color'], 
            marker: {
                color: "black",
                opacity: clusterOpacity,
                width: 1,
            },
            type: 'bar',
            orientation: 'h',
            name:  clusterValues[i],
        };

        clusterColors[clusterValues[i]] = {
            "r": [],
            "g": [],
            "b": [],            
        };

    };

    for (var i = 0; i < arrayCluster.length; i++){

        var c = arrayCluster[i];

        clusterColors[c]["r"].push(arrayR[i]);
        clusterColors[c]["g"].push(arrayG[i]);
        clusterColors[c]["b"].push(arrayB[i]);
        clusters[c]["x"][0]++;

    };

    for (var c in clusters){

        var cluster = clusters[c];

        if (c >= 0) {
          
            var r_mean = parseInt( sumArray(clusterColors[c]["r"]) / clusterColors[c]["r"].length )
            var g_mean = parseInt( sumArray(clusterColors[c]["g"]) / clusterColors[c]["g"].length )
            var b_mean = parseInt( sumArray(clusterColors[c]["b"]) / clusterColors[c]["b"].length )  
          
            clusters[c]["marker"]["color"] = "rgb(" + r_mean + "," + g_mean + "," + b_mean + ")"
            traces.push(cluster);
        
        };
    };

    var layout = {
        width: plotWidth,
        height: plotHeightBar,
        margin: {
            l: plotMargin3D,
            r: plotMargin3D,
            b: plotMargin3D,
            t: plotMargin3D
        },
        showlegend: false,
        barmode: 'stack',
    };

    Plotly.newPlot(targetDiv, traces, layout, {displayModeBar: false, staticPlot: true});
    $('#chartAreaColorBar').show();

};