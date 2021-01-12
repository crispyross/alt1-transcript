import DialogReader from "@alt1/dialog";
import {arraysEqual, toTitleCase} from "./util";
import {ImgRef} from "@alt1/base";

export type Dialog = TextDialog | OptionsDialog;

export interface TextDialog {
    title: string,
    text: string
}

export interface OptionsDialog {
    title: string,
    options: Option[]
}

export interface Option {
    text: string,
    index: number,
    y: number
}

export function readDialog(reader: any, img: ImgRef): Dialog|null {
    const read = reader.read(img);
    if (read === null || read === false)
        return null;
    if (read.text)
        return {
            title: toTitleCase(read.title),
            text: read.text.join(" ")
        };
    else if (read.opts)
        return {
            title: toTitleCase(read.title),
            options: read.opts.map((opt, i) => ({
                text: opt.str,
                index: i,
                y: opt.y
            }))
        }
    else
        return null;
}

export function isTextDialog(obj: any): obj is TextDialog {
    const cast = obj as TextDialog;
    return cast !== null && cast.title != null && cast.text != null;
}

export function isOptionsDialog(obj: any): obj is OptionsDialog {
    const cast = obj as OptionsDialog;
    return cast !== null && cast.title != null && cast.options != null && cast.options.length > 1;
}

export function dialogsEqual(a: Dialog|null, b: Dialog|null): boolean {
    if (a === null)
        return b === null;
    if (b === null)
        return false;
    if (isTextDialog(a)) {
        if (!isTextDialog(b))
            return false;
        return a.title === b.title && a.text == b.text;
    }
    else {
        if (!isOptionsDialog(b))
            return false;
        return a.title === b.title && arraysEqual(a.options, b.options, optionsEqual);
    }
}

export function optionsEqual(a: Option, b: Option) {
    return a.text === b.text && a.index === b.index;
}