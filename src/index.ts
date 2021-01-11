import * as a1 from "@alt1/base";
import DialogReader from "@alt1/dialog"
import {dialogsEqual, isOptionsDialog, Option, OptionsDialog, readDialog, TextDialog} from "./Dialog";
import DialogTree, {DialogTreeNode, OutputStyle} from "./DialogTree";
import Timeout = NodeJS.Timeout;

//tell webpack to add files to output
require("!file-loader?name=[name].[ext]!./index.html");
require("!file-loader?name=[name].[ext]!./appconfig.json");
require("!file-loader?name=[name].[ext]!./appstyles.css");

let dialogHtml;
let infoHtml;
let debugHtml;
let styleCycleButton;
let wrapper;

const reader = new DialogReader();
let trees: DialogTree[] = [];
let curDlgTree: DialogTree|null = null;
let curDlgNode: DialogTreeNode|null = null;
let selectedOption: Option|null = null;
let lastProcessedDialog: TextDialog|OptionsDialog|null = null;
let timesDialogNotFound = 0;

let outputStyle = OutputStyle.Readable;

let selectOptionTimeout: Timeout|null = null;

window.onload = function() {
	infoHtml = document.getElementById("info");
	dialogHtml = document.getElementById("dialog");
	debugHtml = document.getElementById("debug");
	styleCycleButton = document.getElementById("outputstyletoggle");
	wrapper = document.getElementById("wrapper");

	if (!window.alt1) {
		infoHtml.innerText = "Alt1 Toolkit not found!";
		return;
	}

	a1.identifyApp("./appconfig.json");
	window.setInterval(update, 1000);
}

export function toggletrack() {
	// TODO
}

export function cycleOutputStyle() {
	const cycle = [OutputStyle.Readable, OutputStyle.Wiki];
	const buttonLabels = ["Readable", "Wiki"];

	const idx = (cycle.indexOf(outputStyle) + 1) % cycle.length;
	outputStyle = cycle[idx];
	styleCycleButton.innerText = `Output Style (${buttonLabels[idx]})`;
	updateOptionsDialog();
}

function update() {
	const oldScroll = wrapper.scrollTop;
	const isScrolledToBottom = (wrapper.scrollTop === wrapper.scrollHeight - wrapper.clientHeight);

	doUpdate();

	if (isScrolledToBottom)
		wrapper.scrollTop = wrapper.scrollHeight - wrapper.clientHeight;
	else
		wrapper.scrollTop = oldScroll;
}

function selectOption() {
	const dlg = curDlgNode.dialog;
	if (isOptionsDialog(dlg)) {
		const mouseY = a1.getMousePosition().y;
		let closestOpt = dlg.options[0];
		for (const opt of dlg.options) {
			if (Math.abs(mouseY - opt.y) < Math.abs(mouseY - closestOpt.y))
				closestOpt = opt;
		}
		selectedOption = closestOpt;
	}
}

function doUpdate() {
	debugHtml.innerText = "";
	debugHtml.innerText += 'curDlgNode: ' + JSON.stringify(curDlgNode) + '\n';
	debugHtml.innerText += 'lastProcessedDialog: ' + JSON.stringify(lastProcessedDialog) + '\n';
	debugHtml.innerText += 'selectedOption: ' + JSON.stringify(selectedOption) + '\n';

	const img = a1.captureHoldFullRs();
	if (!img) {
		debugHtml.innerText += "captureHoldFullRs failed\n";
		return;
	}

	let pos = reader.find(img);
	let dlg;
	if (pos)
		dlg = readDialog(reader, img);

	if (!pos || !dlg) {
		debugHtml.innerText += "Convo not found\n";
		if (++timesDialogNotFound > 3) {
			debugHtml.innerText += "Conversation ended\n";
			curDlgTree = null;
			curDlgNode = null;
		}
		return;
	}
	timesDialogNotFound = 0;

	debugHtml.innerText += "dlg: " + JSON.stringify(dlg) + '\n';

	if (lastProcessedDialog !== null && dialogsEqual(lastProcessedDialog, dlg)) {
		debugHtml.innerText += "Already processed dialog\n";
		return;
	}
	lastProcessedDialog = dlg;

	// This is a new dialog
	if (selectOptionTimeout)
		clearInterval(selectOptionTimeout);

	if (curDlgTree === null) {
		// Start of new conversation tree
		// Check if dlg matches the start of any existing conversations
		for (const tree of trees) {
			if (dialogsEqual(tree.root?.dialog, dlg)) {
				curDlgTree = tree;
				curDlgNode = tree.root;
				break;
			}
		}

		// If no match found, make new tree
		if (curDlgNode === null) {
			curDlgNode = new DialogTreeNode(dlg);
			curDlgTree = new DialogTree(curDlgNode);
			trees.push(curDlgTree);
		}
	}
	else {
		// dlg is part of an ongoing conversation
		// Check if dlg is a repeat within this conversation
		const found = curDlgTree.find(dlg);
		if (!found) {
			// Add dlg as new node in tree
			const index = selectedOption?.index ?? 0;
			const node = new DialogTreeNode(dlg);
			curDlgNode.children[index] = node;
			curDlgNode = node;
		}
		else {
			curDlgNode = found;
		}
	}

	selectedOption = null;
	if (isOptionsDialog(curDlgNode.dialog))
		selectOptionTimeout = setInterval(selectOption, 100);

	updateOptionsDialog();
}

function updateOptionsDialog() {
	dialogHtml.innerHTML = trees.map(t => t.toString(outputStyle)).join("\n\n\n");
}