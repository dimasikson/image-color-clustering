
// #################### global constants & variables #################

var SUBMIT_IMG_BYPASS = true;

const plotMargin = 0;
const plotMargin3D = 0;

// changes if device == mobile

const contentMargin = 10;
const windowMaxWidth = window.innerWidth - contentMargin*2;

const plotWidth = Math.min(600,windowMaxWidth);
const plotHeight = 450;
const plotHeightBar = 50;

const maxWidth = Math.min(600,windowMaxWidth);
const maxHeight = 250;

const dim = 100;
const approxPixelCount = dim ** 2;

// #################### image functions #################

function displayImg() {

    var imgs = document.getElementById('imageSelect');

    if (imgs.files.length >= 1) {
        imgSlot = document.getElementById('imgToDisplay');
        imgSlot.src = window.URL.createObjectURL(imgs.files[0]);

        // img scaling
        var imgDimCalc = new Image();      
        imgDimCalc.src = imgSlot.src;

        imgDimCalc.onload = function () {

            var w = this.width;
            var h = this.height;

            var scaleWidth = w / maxWidth;
            var scaleHeight = h / maxHeight;
            var maxScale = 1 / Math.max(scaleHeight, scaleWidth);

            imgSlot.width = w * maxScale;
            imgSlot.height = h * maxScale;

        };

        $('#imgToDisplay').show();

        selectAlgorithmChange();
        $('#buttonDashboard').show();

    } else {

        $('#imgToDisplay').hide();
        $('#buttonDashboard').hide();

    };

    $('#chartArea3D').hide();
    $('#chartAreaColorBar').hide();

};

document.getElementById('mainSubmitButton').addEventListener('click', () => {

    var formData = new FormData();
    var imgs = document.getElementById('imageSelect');
    
    // Check file selected or not && if another request isn't running
    if(imgs.files.length >= 1 && SUBMIT_IMG_BYPASS){

        formData.append('file', imgs.files[0]);
        var paramsObj = selectAllParameters();

        for (k in paramsObj){
            var v = paramsObj[k];
            formData.append(k, v);
        };

        // block more requests until the origin request returns
        SUBMIT_IMG_BYPASS = false;

        $.ajax({
            url: '/uploader',
            type: 'post',
            data: formData,
            contentType: false,
            processData: false,
            success: function(response){

                // unblock requests in case of success
                SUBMIT_IMG_BYPASS = true;
                fetchedOutput = JSON.parse(response);

                // plots
                make3DPlot(fetchedOutput, 'chartArea3D')
                makeBarPlot(fetchedOutput, 'chartAreaColorBar')

                $('#chartArea3D').show();
                $('#chartAreaColorBar').show();
            
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

const algorithmParameters = {
    'km' : {
        'n_clusters': [2, 4, 7, 10, 15, 20],
    },
    'hdb' : {
        'min_cluster_size': [approxPixelCount / 1000, approxPixelCount / 500, approxPixelCount / 200, approxPixelCount / 100],
        'min_samples': [approxPixelCount / 2000, approxPixelCount / 1000, approxPixelCount / 500, approxPixelCount / 200],
    },
    'opt' : {
        'min_samples': [approxPixelCount / 2000, approxPixelCount / 1000, approxPixelCount / 500, approxPixelCount / 200, approxPixelCount / 100],
        'max_eps': [0.05, 0.1, 0.2, 0.5],
    },
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

// #######################    plots    ##################################

function make3DPlot(data, targetDiv){

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

    };

    for (var c in clusters){

        var cluster = clusters[c];

        if (c >= 0) {
          
            var r_mean = parseInt( sumArray(cluster["x"]) / cluster["x"].length )
            var g_mean = parseInt( sumArray(cluster["y"]) / cluster["y"].length )
            var b_mean = parseInt( sumArray(cluster["z"]) / cluster["z"].length )  
          
            clusters[c]["marker"]["color"] = "rgb(" + r_mean + "," + g_mean + "," + b_mean + ")"
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

};
function makeBarPlot(data, targetDiv){

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

};