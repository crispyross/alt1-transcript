import * as a1 from "@alt1/base";
import {dialogsEqual, isOptionsDialog, Option, OptionsDialog, readDialog, TextDialog} from "./Dialog";
import DialogTree, {DialogTreeNode, OutputStyle} from "./DialogTree";
import Timeout = NodeJS.Timeout;
import linq from "@tsdotnet/linq";
import {orderBy} from "@tsdotnet/linq/dist/filters";
import {first} from "@tsdotnet/linq/dist/resolutions";

//tell webpack to add files to output
require("!file-loader?name=[name].[ext]!./index.html");
require("!file-loader?name=[name].[ext]!./appconfig.json");
require("!file-loader?name=[name].[ext]!./appstyles.css");

require("!file-loader?name=[name].[ext]!../../alt1-legacy/runeappslib");
require("!file-loader?name=[name].[ext]!../../alt1-legacy/imagedetect");
require("!file-loader?name=[name].[ext]!../../alt1-legacy/alt1lib");
require("!file-loader?name=[name].[ext]!../../alt1-legacy/ocr");
require("!file-loader?name=[name].[ext]!../../alt1-legacy/dialogfull");

let dialogHtml;
let infoHtml;
let debugHtml;
let styleCycleButton;
let trackingButton;
let wrapper;

declare var DialogFullReader: any;
const reader = new DialogFullReader();
let trees: DialogTree[] = [];
let curTree: DialogTree|null = null;
let curNode: DialogTreeNode|null = null;
let selectedOption: Option|null = null;
let lastProcessedDialog: TextDialog|OptionsDialog|null = null;
let timesDialogNotFound = 0;

let outputStyle = OutputStyle.Readable;
let tracking = true;

let checkOptionTimeout: Timeout|null = null;

window.onload = function() {
	infoHtml = document.getElementById("info");
	dialogHtml = document.getElementById("dialog");
	debugHtml = document.getElementById("debug");
	styleCycleButton = document.getElementById("outputStyleToggle");
	trackingButton = document.getElementById("trackToggle")
	wrapper = document.getElementById("wrapper");

	if (!window.alt1) {
		infoHtml.innerText = "Alt1 Toolkit not found!";
		return;
	}

	a1.identifyApp("./appconfig.json");
	window.setInterval(update, 500);
}

export function toggleTracking() {
	tracking = !tracking;
	trackingButton.innerText = "Track: " + (tracking ? "On" : "Off");
}

export function cycleOutputStyle() {
	const cycle = [OutputStyle.Readable, OutputStyle.Wiki];
	const buttonLabels = ["Readable", "Wiki"];

	const idx = (cycle.indexOf(outputStyle) + 1) % cycle.length;
	outputStyle = cycle[idx];
	styleCycleButton.innerText = `Output Style (${buttonLabels[idx]})`;
	updateDialogOutput();
}

function update() {
	if (!tracking)
		return;

	const oldScroll = wrapper.scrollTop;
	const isScrolledToBottom = (wrapper.scrollTop === wrapper.scrollHeight - wrapper.clientHeight);

	infoHtml.innerText = "";
	debugHtml.innerText = "";
	doUpdate();

	if (isScrolledToBottom)
		wrapper.scrollTop = wrapper.scrollHeight - wrapper.clientHeight;
	else
		wrapper.scrollTop = oldScroll;
}

function checkOption() {
	const dlg = curNode?.dialog;
	if (isOptionsDialog(dlg)) {
		const mouseY = a1.getMousePosition()?.y;
		if (!mouseY)
			return;

		selectedOption = linq(dlg.options)
			.filter(orderBy(opt => Math.abs(mouseY - opt.y)))
			.resolve(first)

		infoHtml.innerText = `Selected option: ${selectedOption.index + 1}. ${selectedOption.text}`;
	}
}

function doUpdate() {
	if (selectedOption)
		infoHtml.innerText += `Selected option: ${selectedOption.index + 1}. ${selectedOption.text}`

	const screen = a1.captureHoldFullRs();
	let dlg;
	if (!reader.find(screen) || !(dlg = readDialog(reader, screen))) {
		infoHtml.innerText += "No dialog found.\n";
		if (++timesDialogNotFound > 3) {
			curTree = null;
			curNode = null;
			infoHtml.innerText += "Not currently in a conversation.\n";
		}
		return;
	}

	timesDialogNotFound = 0;

	if (dialogsEqual(lastProcessedDialog, dlg)) {
		debugHtml.innerText += "Already processed dialog\n";
		return;
	}
	lastProcessedDialog = dlg;

	if (checkOptionTimeout)
		clearInterval(checkOptionTimeout);

	if (curTree === null) {
		// Start of new conversation tree
		// Check if dlg matches the start of any existing conversations
		for (const tree of trees) {
			if (tree.root?.dialog && dialogsEqual(tree.root.dialog, dlg)) {
				curTree = tree;
				break;
			}
		}

		// If no match found, make new tree
		if (curTree === null) {
			curTree = new DialogTree(new DialogTreeNode(dlg));
			trees.push(curTree);
		}
	}

	if (!curNode)
		curNode = curTree.root;
	else
		curNode = curTree.findOrAddDialog(dlg, curNode, selectedOption);

	selectedOption = null;
	if (isOptionsDialog(curNode?.dialog))
		checkOptionTimeout = setInterval(checkOption, 100);

	updateDialogOutput();
}

function updateDialogOutput() {
	dialogHtml.innerHTML = trees.map(t => t.toString(outputStyle)).join("\n\n\n");
}