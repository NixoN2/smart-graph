import { inspect } from "util";

export const printObject = (object: Object) => console.log(inspect(object, {showHidden: false, depth: null, colors: true}))