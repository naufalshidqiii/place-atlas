/*
	========================================================================
	The 2022 /r/place Atlas

	An Atlas of Reddit's 2022 /r/place, with information to each
	artwork	of the canvas provided by the community.

	Copyright (c) 2017 Roland Rytz <roland@draemm.li>
	Copyright (c) 2022 r/placeAtlas2 contributors

	Licensed under the GNU Affero General Public License Version 3
	https://place-atlas.stefanocoding.me/license.txt
	========================================================================
*/

function initDraw(){
	
	// Set up interface
	wrapper.classList.remove('listHidden')

	var backButton = document.getElementById("showListButton");
	backButton.insertAdjacentHTML("afterend", '<button class="btn btn-outline-primary" type="button" data-bs-toggle="offcanvas" data-bs-target="#offcanvasDraw" aria-controls="offcanvasDraw">Edit</button><a id="drawBackButton" class="btn btn-outline-primary" href="./">Exit Draw Mode</a>');
	backButton.remove();

	var myOffcanvas = document.getElementById("offcanvasDraw");
	var bsOffcanvas = new bootstrap.Offcanvas(myOffcanvas);
	bsOffcanvas.show();

	window.render = render
	window.renderBackground = renderBackground
	window.updateHovering = updateHovering

	// Initialize variables
	var finishButton = document.getElementById("finishButton");
	var resetButton = document.getElementById("resetButton");
	var undoButton = document.getElementById("undoButton");
	var redoButton = document.getElementById("redoButton");
	
	var drawControlsBody = document.getElementById("offcanvasDraw-drawControls");
	var objectInfoBody = document.getElementById("offcanvasDraw-objectInfo");
	var objectInfoForm = document.getElementById("objectInfo");
	
	var cancelButton = document.getElementById("cancelButton");

	var exportModal = new bootstrap.Modal(document.getElementById("exportModal"))
	var exportModalElement = document.getElementById("exportModal")

	var rShiftPressed = false;
	var lShiftPressed = false;
	var shiftPressed = false;

	var highlightUncharted = true;

	renderBackground();
	applyView();

	container.style.cursor = "crosshair";
	
	var path = [];
	var drawing = true;

	var undoHistory = [];

	render(path);

	container.addEventListener("mousedown", function(e){
		lastPos = [
			 e.clientX
			,e.clientY
		];
	});

	function getCanvasCoords(x, y){
		x = x - container.offsetLeft;
		y = y - container.offsetTop;

		var pos = [
			 ~~((x - (container.clientWidth/2  - innerContainer.clientWidth/2  + zoomOrigin[0]))/zoom)+0.5
			,~~((y - (container.clientHeight/2 - innerContainer.clientHeight/2 + zoomOrigin[1]))/zoom)+0.5
		];
		
		if(shiftPressed && path.length > 0){
			var previous = path[path.length-1];
			
			if(Math.abs(pos[1] - previous[1]) > Math.abs(pos[0] - previous[0]) ){
				pos[0] = previous[0];
			} else {
				pos[1] = previous[1];
			}
		}

		return pos;
	}

	container.addEventListener("mouseup", function(e){
		

		if(Math.abs(lastPos[0] - e.clientX) + Math.abs(lastPos[1] - e.clientY) <= 4 && drawing){

			var coords = getCanvasCoords(e.clientX, e.clientY);
			
			path.push(coords);
			render(path);

			undoHistory = [];
			redoButton.disabled = true;
			undoButton.disabled = false;

			if(path.length >= 3){
				finishButton.disabled = false;
			}
		}
	});

	window.addEventListener("mousemove", function(e){
		
		if(!dragging && drawing && path.length > 0){

			console.log(123)
			
			var coords = getCanvasCoords(e.clientX, e.clientY);
			render(path.concat([coords]));
		}
		
	});

	window.addEventListener("keyup", function(e){
		if (e.key == "z" && e.ctrlKey){
			undo();
		} else if(e.key == "y" && e.ctrlKey){
			redo();
		} else if (e.key === "Shift" ){
			if(e.code === "ShiftRight"){
				rShiftPressed = false;
			} else if(e.code === "ShiftLeft"){
				lShiftPressed = false;
			}
			shiftPressed = rShiftPressed || lShiftPressed;
		}
	});

	window.addEventListener("keydown", function(e){
		if (e.key == "Enter"){
			finish();
		} else if (e.key === "Shift" ){
			if(e.code === "ShiftRight"){
				rShiftPressed = true;
			} else if(e.code === "ShiftLeft"){
				lShiftPressed = true;
			}
			shiftPressed = rShiftPressed || lShiftPressed;
		}
	});

	finishButton.addEventListener("click", function(e){
		finish();
	});

	undoButton.addEventListener("click", function(e){
		undo();
	});

	redoButton.addEventListener("click", function(e){
		redo();
	});

	resetButton.addEventListener("click", function(e){
		reset();
	});
	
	cancelButton.addEventListener("click", function(e){
		reset();
	});

	// refocus on button when modal is closed
	exportModalElement.addEventListener('hidden.bs.modal', function() {
		document.getElementById("exportButton").focus();
	});

	// bind it the same as you bind a button, but on submit
	objectInfoForm.addEventListener('submit', function(e) {
		e.preventDefault()
		exportJson()
	});

	document.getElementById("highlightUncharted").addEventListener("click", function(e){
		highlightUncharted = this.checked;
		render(path);
	});

	function exportJson(){		
		var exportObject = {
			 id: 0
			,name: document.getElementById("nameField").value
			,description: document.getElementById("descriptionField").value
			,website: document.getElementById("websiteField").value
			,subreddit: document.getElementById("subredditField").value
			,center: calculateCenter(path)
			,path: path
		};
		var jsonString = JSON.stringify(exportObject, null, "\t");
		var textarea = document.getElementById("exportString");
		jsonString = jsonString.split("\n");
		jsonString = jsonString.join("\n    ");
		jsonString = "    "+jsonString;
		textarea.value = jsonString;
		console.log("a");
		var directPostUrl = "https://www.reddit.com/r/placeAtlas2/submit?selftext=true&title=New%20Submission&text="+encodeURIComponent(document.getElementById("exportString").value);
		document.getElementById("exportDirectPost").href=directPostUrl;

		exportModal.show();
	}

	function calculateCenter(path){

		var area = 0,
			i,
			j,
			point1,
			point2,
			x = 0,
			y = 0,
			f;

		for (i = 0, j = path.length - 1; i < path.length; j=i,i++) {
			point1 = path[i];
			point2 = path[j];
			f = point1[0] * point2[1] - point2[0] * point1[1];
			area += f;
			x += (point1[0] + point2[0]) * f;
			y += (point1[1] + point2[1]) * f;
		}
		area *= 3;

		return [Math.floor(x / area)+0.5, Math.floor(y / area)+0.5];
	}

	function undo(){
		if(path.length > 0 && drawing){
			undoHistory.push(path.pop());
			redoButton.disabled = false;
			if(path.length == 0){
				undoButton.disabled = true;
			}
			render(path);
		}
	}

	function redo(){
		if(undoHistory.length > 0 && drawing){
			path.push(undoHistory.pop());
			undoButton.disabled = false;
			if(undoHistory.length == 0){
				redoButton.disabled = true;
			}
			render(path);
		}
	}

	function finish(){
		if(drawing) {
			drawing = false;
			render(path);
			objectInfoBody.removeAttribute("style");
			drawControlsBody.style.display = "none";
			document.getElementById("nameField").focus();
		}
	}

	function reset(){
		path = [];
		undoHistory = [];
		finishButton.disabled = true;
		undoButton.disabled = true; // Maybe make it undo the cancel action in the future
		redoButton.disabled = true;
		drawing = true;
		render(path);
		objectInfoBody.style.display = "none";
		drawControlsBody.removeAttribute("style");

		document.getElementById("nameField").value = "";
		document.getElementById("descriptionField").value = "";
		document.getElementById("websiteField").value = "";
		document.getElementById("subredditField").value = "";
	}

	function renderBackground(){

		backgroundContext.clearRect(0, 0, canvas.width, canvas.height);
			
		backgroundContext.fillStyle = "rgba(0, 0, 0, 1)";
		//backgroundContext.fillRect(0, 0, canvas.width, canvas.height);
		
		for(var i = 0; i < atlas.length; i++){

			var path = atlas[i].path;
			
			backgroundContext.beginPath();

			if(path[0]){
				backgroundContext.moveTo(path[0][0], path[0][1]);
			}
			
			for(var p = 1; p < path.length; p++){
				backgroundContext.lineTo(path[p][0], path[p][1]);
			}

			backgroundContext.closePath();
			
			backgroundContext.fill();
		}
	}

	function render(path){

		context.globalCompositeOperation = "source-over";
		context.clearRect(0, 0, canvas.width, canvas.height);
		
		if(highlightUncharted){
			context.drawImage(backgroundCanvas, 0, 0);
			context.fillStyle = "rgba(0, 0, 0, 0.4)";
		} else {
			context.fillStyle = "rgba(0, 0, 0, 0.6)";
		}
		
		context.fillRect(0, 0, canvas.width, canvas.height);

		context.beginPath();

		if(path[0]){
			context.moveTo(path[0][0], path[0][1]);
		}
		
		for(var i = 1; i < path.length; i++){
			context.lineTo(path[i][0], path[i][1]);
		}

		context.closePath();

		context.strokeStyle = "rgba(255, 255, 255, 1)";
		context.stroke();

		context.globalCompositeOperation = "destination-out";

		context.fillStyle = "rgba(0, 0, 0, 1)";
		context.fill();
		
	}
	
	function updateHovering(e, tapped){
		if(!dragging && (!fixed || tapped)){
			var pos = [
				 (e.clientX - (container.clientWidth/2 - innerContainer.clientWidth/2 + zoomOrigin[0] + container.offsetLeft))/zoom
				,(e.clientY - (container.clientHeight/2 - innerContainer.clientHeight/2 + zoomOrigin[1] + container.offsetTop))/zoom
			];
			var coords_p = document.getElementById("coords_p");

			// Displays coordinates as zero instead of NaN
			if (isNaN(pos[0]) == true) {
				coords_p.innerText = "0, 0";
			} else {
				coords_p.innerText = Math.ceil(pos[0]) + ", " + Math.ceil(pos[1]);
			}
		}
	}
}
