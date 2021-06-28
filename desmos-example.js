const graphUrl = 'https://www.desmos.com/calculator/teazqfy6ei'; //This is the graph we'll import from Desmos
const swColors = {blue: 'rgb(0,114,188)', red: 'rgb(209,34,68)', silver: 'rgb(192,192,192', purple: 'rgb(146,39,142)', green: 'rgb(0,127,62', dkgray: 'rgb(128,128,128)'};

var calc;
async function getData(url) {
  graphData=await jQuery.getJSON(url); //This is the only dependency on JSON
  return graphData;
} 


async function drawGraph(graphData, elt) {
  calc = await Desmos.GraphingCalculator(elt,graphData.options);
  calc.setState(graphData.state);
  calc.updateSettings ({ // Settings that apply to the whole graph. We can either inherit them from Desmos or state them here
    keypad:false,
    expressions:false,
    settingsMenu:false,
    zoomButtons:false,
    projectorMode:true,
    border:false,
    showGrid:false,
    zoomButtons: false,
    lockViewport:true,
    autosize:false, // Leave this up to my resizer function so that I also adjust the font size.
    showXAxis:false,
    showYAxis:false,
    fontSize: 12, // irrelevant: This will get re-set below
    colors:swColors,
    trace:false
  });
  calc.setMathBounds({ //Where the thing looks at the start (we could go with what's already set in the calculator)
    left:-1,
    right:11,
    bottom:-1,
    top:10.5
  });
  calc.colors.BLUE = '#0072BC';  // Source: https://www.reddit.com/r/desmos/comments/bjv0tz/sacks_spiral_feat_illegal_colours_using_console/
  calc.colors.RED = '#d12244';
  calc.colors.GREEN = '#007F3E';
  calc.colors.ORANGE = '#C74A1B';
  calc.colors.PURPLE = '#92278f';
  await resizer();
  return calc;
}



// This uses folders to "group" function id's together 
function findFolder(f) { // This function calls up all of the expressions that are in a specific folder.
  var foldId = expList.filter(t=>t.type=="folder").find(t=>t.title==f).id; // This is the folderId of the folder named "f" eg folder "Axes"
  var folderExpressions = expList.filter(t=>t.folderId==foldId).filter(t=>t.type=="expression").map(i=>i.id); // This is the list of the expression id's in the folder named "f"
  return folderExpressions;
}

// Here is a family of Powerpoint-like animation functions. Each of these needs an "undo" function for scrolling up.

function opaque(id) { // To make sure this function works properly, ensure the calculator graph doesn't rely on any defaults for opacity.
  if (this=='on') {
    calc.setExpression({id:id, lineOpacity:0.04, pointOpacity:0.04, fillOpacity:0.04}); 
  }
  else if (this=='off') {
    var opL, opP, opO;
    opL = expList.find(i => i.id==id).lineOpacity;
    if (opL!= null) {
      calc.setExpression({id:id, lineOpacity:opL});
    };
    opP = expList.find(i => i.id==id).pointOpacity;
    if (opP!= null) {
      calc.setExpression({id:id, pointOpacity:opP});
    };
    opO = expList.find(i => i.id==id).fillOpacity;
    if (opO!= null) {
      calc.setExpression({id:id, fillOpacity:opO});
    }; 
  }
}

function focus(id) { // gotta make points visible too, in order to get their labels
  if (this=='on') {
    calc.setExpression({id:id, labelSize:Desmos.LabelSizes.LARGE, pointOpacity:1}); 
    var lWidth = expList.find(i => i.id==id).lineWidth;
    if (lWidth != null) {
      calc.setExpression({id:id, lineWidth:lWidth*2});
      calc.setExpression({id:id, lineOpacity:1});
    }; 
  }
  else if (this=='off') {
    calc.setExpression({id:id, labelSize:Desmos.LabelSizes.MEDIUM}); 
    var lWidth = expList.find(i => i.id==id).lineWidth;
    if (lWidth != null) {
      calc.setExpression({id:id, lineWidth:lWidth}); 
    };
   }
}

function hide(id) {
    calc.setExpression({id:id, hidden:true, showLabel:false});     
}

function unhide(id) { 
  if (expList.find(i => i.id == id).hidden != true) { // Need to make sure not to unhide stuff that was originally hidden.
  calc.setExpression({id:id, hidden:false});
  };
  if (expList.find(i => i.id == id).showLabel == true) { // Need to make sure not to unhide stuff that was originally hidden.
    calc.setExpression({id:id, showLabel:true});
    };  
}


// This is the code for resizing the window to make the graph and font size responsive. 
function resizer() {
  var fontSz=Math.min(16,Math.max(10,10+(window.innerWidth-360)*6/440)); // ensures the font size varies from 10 to 16 point when screen sizes vary from 360 to 800 (a range of 440)
  calc.updateSettings({fontSize:fontSz});
  calc.resize();
  graphHeight=document.querySelector('#fig1 .graph_container').offsetHeight;
};

// debouncer to make sure that scroll and resize events don't call the function too many times
const debounce = (func, delay = 100) => {
  let debounceTimer;
  return function() {
      const context = this;
      const args = arguments;
          clearTimeout(debounceTimer);
              debounceTimer
          = setTimeout(() => func.apply(context, args), delay);
  };
} 

// Find where each of the steps is marked on the page, so that it can fire transitions
function findStepLocations (figname) {  // returns a list of where each step is on the page. // Might need to call with resizer
  var graph=document.querySelector(figname);
  var steps=Array.from(graph.querySelectorAll(".step")).map(i=>i.offsetTop-graphHeight-100);
  steps.unshift(graph.offsetTop+0); // Add the graph itself as step zero
  steps.push(graph.offsetTop+graph.offsetHeight-graphHeight-100); // Add the bottom of the last element as the final step
  steps.push(Infinity); // Add an infinity on the end, because findIndex is a < operator
  console.log("steps: "+steps)
  return steps;
}

var expList, stepLocations, graphHeight, data, calc; 
var prevStep=0, currentStep=0;
var scrollDirection='down';
async function desmosGraph() {
  data = await getData(graphUrl);
  var elt = document.querySelector('#calculator'); // #calculator is the html element that'll display our graph. Apply CSS styling to the#calculator div
  calc = await drawGraph(data, elt);
  expList = calc.getState().expressions.list; 
  console.log("List of folders:");
  console.table(expList.filter(t=>t.type=="folder").map(i=>({folderName:i.title, folderId:i.id})));
  stepLocations=findStepLocations('#fig1');
  window.addEventListener('resize', debounce(resizer,100)); 
  window.addEventListener('scroll', handleScroll); // could call debounce(handleScroll,10)
};

desmosGraph();

// This is the set of scrolling controls

function handleScroll () {
  var scrolledSoFar=window.pageYOffset;
  var currentStep=stepLocations.findIndex(i => (i>=pageYOffset) ); 
  console.log("Prev: " + prevStep + " Current: "+currentStep)
  if (currentStep>prevStep) { // scrolling down the page
    scrollDirection='down';
    if (prevStep==0) { 
      stepzero(); }
    if (prevStep==1) {
      stepone();  }
    if (prevStep==2) {
      steptwo();  }
    if (prevStep==3) {
      stepthree();  }
    if (prevStep==4) {
      stepfour();   }
    if (prevStep==5) {
      stepfive();   }
    if (prevStep==6) {
      stepsix();    }
    prevStep=currentStep;
  };
  if (currentStep<prevStep) { // scrolling back up the page
    scrollDirection='up';
    if (currentStep==5) {
      stepfive();
    }
    if (currentStep==4) {
      stepfour();
    }
    if (currentStep==3) {
      stepthree();
    }
    if (currentStep==2) {
      steptwo();
    }
    if (currentStep==1) {
      stepone();
    }
    if (currentStep==0) {
      stepzero();
    }
    prevStep=currentStep;
  };
}




function stepzero() { // fade the graph
  document.querySelector('.graph_container').style.position="sticky";
  var swtch='on', unswtch='off';
  if (scrollDirection=='down') {
    document.querySelectorAll('.figure_caption').forEach(el => el.style.opacity='0');
    console.log("stepzero: down");  
  }
  else if (scrollDirection=='up') {
    swtch='off';
    unswtch='on';
    document.querySelectorAll('.figure_caption').forEach(el => el.style.opacity='1');
    console.log("stepzero: up");  
  };
  findFolder("Static Demand Curve").forEach(opaque, swtch);
  findFolder("Movable Demand Curve").forEach(opaque, swtch);
  findFolder("Static Supply Curve").forEach(opaque, swtch);
  findFolder("Movable Supply Curve").forEach(opaque, swtch);
  findFolder("Original Equilibrium Point").forEach(opaque, swtch);
  findFolder("Dynamic New Equilibrium Point").forEach(opaque, swtch);
  findFolder("Horizontal Plumb").forEach(opaque, swtch);
  findFolder("Vertical Plumb").forEach(opaque, swtch);
  findFolder("Price Indicators").forEach(opaque, swtch);
  findFolder("Quantity Indicators").forEach(opaque, swtch);
}

function stepone() { // focus on the demand curve
  var swtch='on', unswtch='off';
  if (scrollDirection=='down') {
    document.querySelectorAll('.figure_caption[step="1"]').forEach(el => el.style.opacity='1');
    document.querySelectorAll('.step[step="1"]').forEach(el=>el.style.borderLeft="thick dashed #0072bc")
  }
  else if (scrollDirection=='up') {
    document.querySelectorAll('.figure_caption[step="1"]').forEach(el => el.style.opacity='0');
    document.querySelectorAll('.step[step="1"]').forEach(el=>el.style.borderLeft="none")
    swtch='off';
    unswtch='on';
  };
  // findFolder("Static Demand Curve").forEach(opaque,1); // make it actually solid here.
  findFolder("Static Demand Curve").forEach(opaque, unswtch);
  findFolder("Static Demand Curve").forEach(focus, swtch);
  console.log("stepone");
}


function steptwo() {
  var swtch='on', unswtch='off';
  if (scrollDirection=='down') {
    document.querySelectorAll('.figure_caption[step="2"]').forEach(el => el.style.opacity='1');
    document.querySelectorAll('.step[step="2"]').forEach(el=>el.style.borderLeft="thick dashed #d12244");  
  }
  else if (scrollDirection=='up') {
    document.querySelectorAll('.figure_caption[step="2"]').forEach(el => el.style.opacity='0');
    document.querySelectorAll('.step[step="2"]').forEach(el=>el.style.borderLeft="none");  
    swtch='off';
    unswtch='on';
  };
  findFolder("Static Demand Curve").forEach(focus,unswtch);
  findFolder("Static Supply Curve").forEach(opaque,unswtch);
  findFolder("Static Supply Curve").forEach(focus, swtch);
  console.log("steptwo");
}


function stepthree() { // Equilibrium dot
  var swtch='on', unswtch='off';
  if (scrollDirection=='down') {
    document.querySelectorAll('.figure_caption[step="3"]').forEach(el => el.style.opacity='1');
    document.querySelectorAll('.step[step="3"]').forEach(el=>el.style.borderLeft="thick dashed #000000");
    }
  else if (scrollDirection=='up') {
    document.querySelectorAll('.figure_caption[step="3"]').forEach(el => el.style.opacity='0');
    document.querySelectorAll('.step[step="3"]').forEach(el=>el.style.borderLeft="none");
    swtch='off';
    unswtch='on';
  };
  findFolder("Static Supply Curve").forEach(focus,unswtch);
  findFolder("Original Equilibrium Point").forEach(opaque,unswtch);
  findFolder("Original Equilibrium Point").forEach(focus, swtch);
  console.log("stepthree")
}

function stepfour() { //equilibrium price
  var swtch='on', unswtch='off';
  if (scrollDirection=='down') {
    document.querySelectorAll('.figure_caption[step="4"]').forEach(el => el.style.opacity='1');
    document.querySelectorAll('.step[step="4"]').forEach(el=>el.style.borderLeft="thick dashed #92278f");
  
  }
  else if (scrollDirection=='up') {
    document.querySelectorAll('.figure_caption[step="4"]').forEach(el => el.style.opacity='0');
    document.querySelectorAll('.step[step="4"]').forEach(el=>el.style.borderLeft="none");
    swtch='off';
    unswtch='on';
  }
  findFolder("Original Equilibrium Point").forEach(focus,unswtch);
  findFolder("Horizontal Plumb").forEach(opaque,swtch);
  findFolder("Horizontal Plumb").forEach(focus,swtch);
  findFolder("Price Indicators").forEach(opaque,swtch);
  findFolder("Price Indicators").forEach(focus,swtch);
  console.log("stepfour")
}

function stepfive() { // Equilibrium q
  var swtch='on', unswtch='off';
  if (scrollDirection=='down') {
    document.querySelectorAll('.figure_caption[step="5"]').forEach(el => el.style.opacity='1');
    document.querySelectorAll('.step[step="5"]').forEach(el=>el.style.borderLeft="thick dashed #007F3E");
  }
  else if (scrollDirection=='up') {
    document.querySelectorAll('.figure_caption[step="5"]').forEach(el => el.style.opacity='0');
    document.querySelectorAll('.step[step="5"]').forEach(el=>el.style.borderLeft="none");
    swtch='off';
    unswtch='on';
  };
  findFolder("Horizontal Plumb").forEach(focus,unswtch);
  findFolder("Price Indicators").forEach(focus,unswtch);
  findFolder("Vertical Plumb").forEach(opaque,swtch);
  findFolder("Vertical Plumb").forEach(focus,swtch);
  findFolder("Quantity Indicators").forEach(opaque,swtch);
  findFolder("Quantity Indicators").forEach(focus,swtch); 
  console.log("stepfive")
}

function stepsix() { // Make the graph moveable
  var swtch='on', unswtch='off';
  findFolder("Vertical Plumb").forEach(focus,unswtch);
  findFolder("Quantity Indicators").forEach(focus, unswtch);
  findFolder("Vertical Plumb").forEach(opaque,unswtch); // Make the old plumb lines *somewhat* transparent. It works at the top
  findFolder("Horizontal Plumb").forEach(opaque, unswtch);
  findFolder("Static Demand Curve").forEach(opaque, unswtch);
  findFolder("Static Supply Curve").forEach(opaque, unswtch);
  findFolder("Movable Supply Curve").forEach(opaque,unswtch);
  findFolder("Movable Demand Curve").forEach(opaque,unswtch);
  findFolder("Dynamic New Equilibrium Point").forEach(opaque,unswtch);
  console.log("stepsix")
}

// I need to deal with ways in which the student might fiddle with the graph.

// window.addEventListener('scroll',function(e){ 
//   var $el = $('.fixedElement'); 
//   var isPositionFixed = ($el.css('position') == 'fixed');
//   if ($(this).scrollTop() > 200 && !isPositionFixed){ 
//     $el.css({'position': 'fixed', 'top': '0px'}); 
//   }
//   if ($(this).scrollTop() < 200 && isPositionFixed){
//     $el.css({'position': 'static', 'top': '0px'}); 
//   } 
// });

// function updateGraph(step) {
//   if step==
//   calc.setExpressions([
//     { id: lines[0], lineColor:calc.colors.blu, lineOpacity:0.1 },  
//     { id: lines[1], lineOpacity:0.1 },
//     // { id: 'jw', latex:'y=1.2x'}
//   ]);
// }


// Learn some stuff from Desmos player: https://github.com/jason-woolf/DesmosPlayer
// To get id's from the console: console.table(Calc.getState().expressions.list.map(e => ({id: e.id, type: e.type, latex: e.latex})))
// To get access to all of the expressions, use Calc.getState().expressions.list[63]
// j=calc.getExpressions();
// setTimeout(function(){
//   calc.setExpression({ id: 'linex1', latex: 'y=1.76x', color: calc.colors.purple, lineOpacity:0.1 });
// }, 1000); // this is a kludge, but we have to wait for the graph object to load before we make changes to it.
// calc.setExpression({ id: 'linex1', lineOpacity:0.1, color: calc.colors.purple})
// // stte = fig1.getState()
// // stte["expressions"]["list"][n].slider.animationPeriod = milliseconds
// Calc.setState(stte)
// calc.setExpression({id:'juzzo', latex: 'y=x-0.75'});
// folders=calc.getState().expressions.list.filter(t=>t.type=="folder").map(f=>({folderId: f.id, folderName: f.title}))



// function fade(id) { 
//     var op = 1;  // initial opacity. Fix this so it gets starting opacity. But realize that the relevant expression characteristic is only coded if the line was made opaque earlier.
//     var timer = setInterval(function () {
//         if (op <= 0.1){
//             clearInterval(timer);
//             hide(id);
//         }
//         calc.setExpression({id:id, lineOpacity:op, pointOpacity:op, fillOpacity:op}); 
//         op -= 0.1; 
//         console.log(op);
//     }, 1);
// }

// function unfade(id) { 
//   var op = 0;  // initial opacity. Fix this so it gets starting opacity. But realize that the relevant expression characteristic is only coded if the line was made opaque earlier.
//   var timer = setInterval(function () {
//       if (op >= 0.9){
//           clearInterval(timer);
//           unhide(id);
//       }
//       calc.setExpression({id:id, lineOpacity:op, pointOpacity:op, fillOpacity:op}); 
//       op += 0.1; 
//   }, 1);
// }


// function opaq(o,id) { // I want to implement a higher order function
//   calc.setExpression({id:this.id, lineOpacity:o, pointOpacity:o, fillOpacity:o}); 
// }