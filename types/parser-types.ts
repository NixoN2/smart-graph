import { UsingForDeclaration } from "@solidity-parser/parser/dist/src/ast-types";

export type ForDeclarationNode = UsingForDeclaration & { typeName: {
    type: string;
    name: string;
    stateMutability: null | boolean
}}
