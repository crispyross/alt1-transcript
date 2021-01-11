import {TextDialog, OptionsDialog, Option, dialogsEqual, isTextDialog} from "./Dialog";

export enum OutputStyle {
    Readable, Wiki
}

export default class DialogTree {
    root: DialogTreeNode|null

    constructor(root?: DialogTreeNode) {
        this.root = root ?? null;
    }

    find = (dlg): DialogTreeNode|null => this.root?.find(dlg) ?? null;
    toString = (style = OutputStyle.Readable) => this.root?.toString(style) ?? "";
}

export class DialogTreeNode {
    dialog: TextDialog|OptionsDialog
    children: DialogTreeNode[]

    constructor(dialog: TextDialog|OptionsDialog) {
        this.dialog = dialog;
        this.children = [];
    }

    find(dlg: TextDialog|OptionsDialog): DialogTreeNode|null {
        if (dialogsEqual(dlg, this.dialog))
            return this;
        for (const child of this.children) {
            if (!child) continue;
            const found = child.find(dlg);
            if (found)
                return found;
        }
        return null;
    }

    toString(style: OutputStyle) {
        switch (style) {
            case OutputStyle.Readable:
                return this.toReadableString();
            case OutputStyle.Wiki:
                return this.toWikiString();
        }
        throw new Error("Unreachable code");
    }

    toReadableString(level = 0) {
        let result = "";
        if (isTextDialog(this.dialog)) {
            result = '   '.repeat(level) + `<b>${this.dialog.title}:</b> ${this.dialog.text}\n`
            for (const child of this.children)
                result += child.toReadableString(level)
        }
        else {
            result = '   '.repeat(level) + (this.dialog.title || "Select An Option") + '\n';
            for (let i = 0; i < this.dialog.options.length; ++i) {
                const opt = this.dialog.options[i];
                result += '   '.repeat(level + 1) + ' - ' + opt.text + '\n';

                if (this.children[i]) {
                    result += this.children[i].toReadableString(level + 2);
                }
            }
        }
        return result;
    }

    toWikiString(level = 1) {
        let result: string;
        if (isTextDialog(this.dialog)) {
            result = "*".repeat(level) + `'''${this.dialog.title}:''' ${this.dialog.text}\n`
            for (const child of this.children)
                result += child.toWikiString(level);
            return result;
        }
        else {
            result = "*".repeat(level) + (this.dialog.title || "Select An Option") + '\n';
            for (let i = 0; i < this.dialog.options.length; ++i) {
                const opt = this.dialog.options[i];
                result += "*".repeat(level + 1) + opt.text + '\n';

                if (this.children[i]) {
                    result += this.children[i].toWikiString(level + 2);
                }
                else {
                    result += "*".repeat(level + 2) + "{{Missing transcript}}\n";
                }
            }
            return result;
        }
    }
}