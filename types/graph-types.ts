import { ModifierInvocation } from "@solidity-parser/parser/dist/src/ast-types";

interface Location {
    start: {
        line: number;
        column: number;
    };
    end: {
        line: number;
        column: number;
    };
}
type VariableVisibility = "internal" | "public" | "private" | "default"
type FunctionVisibility = VariableVisibility | "external"
export type NodeType = "variable" | "function" | "function_parameter" | "event" | "version" | "using-for" | "inherit" | "contractName" | "modifier"
export interface StateVariable {
    type: string
    visibility: VariableVisibility
    nodeType: NodeType
    isConst?: boolean
    name: string
    isState: boolean
    loc?: Location
}

export interface ModifierDefinition {
    name: string
    nodeType: string
    loc?: Location
    type?: string
}

export interface InheritContract {
    name: string
    nodeType: string
    loc?: Location
    type?: string
}

export interface ContractInfo {
    name: string
    nodeType: string
    loc?: Location
    type?: string
}

export interface VariableDeclaration {
    name: string
    variables: Variable[]
}

export interface Variable {
    name: string,
    storageLocation: string,
    isConst: boolean
    isState: boolean
    visibility: VariableVisibility
    nodeType: string
    type: string
}


export interface UsingFor {
    type: string
    nodeType: NodeType
    name: string
    loc?: Location
}

export interface ExactPragma {
    type: "exact" | "inexact"
    nodeType: NodeType
    name: string
    version: [string, string, string]
    loc?: Location
}

export interface IntervalPragma {
    type: "interval"
    nodeType: NodeType
    name: string
    leftVersion: [string, string, string]
    rightVersion: [string, string, string]
    loc?: Location
}

export type Pragma = ExactPragma | IntervalPragma

export interface Function {
    type: string
    visibility: FunctionVisibility
    isConstructor: boolean
    parameters: VariableDeclaration[]
    name: string
    isReceiveEther: boolean
    isFallback: boolean
    body: GraphStructure
    modifiers: ModifierInvocation[]
    isVirtual: boolean
    nodeType: NodeType
    loc?: Location
}

export interface Expression {
    name: string
    expression: {name: string, order: string}
}

type Node = StateVariable | UsingFor | Pragma | Function | ModifierDefinition | ContractInfo | InheritContract

export interface GraphStructure {
    node: (id: string) => Node
    setNode: (id: string, node: Object) => void
    edge: (node1: string, node2: string) => Object | string
    setEdge: (node1: string, node2: string, edge: Object | string) => void
    nodes: () => string[],
    edges: () => Array<{v: string, w: string}>
}

