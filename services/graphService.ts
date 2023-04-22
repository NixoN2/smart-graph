import { parse, visit } from "@solidity-parser/parser";
import type { ContractDefinition, ElementaryTypeName, InheritanceSpecifier, ModifierDefinition } from "@solidity-parser/parser/dist/src/ast-types";
import { Graph } from "graphlib";
import type { GraphStructure, NodeType } from "../types/graph-types"
import { parserService } from "./parserService";
import { printObject } from '../helpers/console';

export const graphService = {
  addNodeToGraph: (graph: GraphStructure, previousNode: { name: string }, node: Object & { name: string }) => {
    if (node) {
      graph.setNode(node.name, node);
      graph.setEdge(
        previousNode.name,
        node.name,
        previousNode.name + "_" + node.name
      );
      return node as typeof previousNode
    }
  },
  getNodesByType: (graph: GraphStructure, type: NodeType) => {
    return graph.nodes().map((id) => graph.node(id)).filter((node) => node && node.nodeType === type)
  }, 
  getNodesByEdges: (graph: GraphStructure) => {
    const edges = graph.edges()
    return edges.map((edge) => edge.w).filter((edge) => edge !== "End").map((vertex) => graph.node(vertex))
  },
  getEdgesByStateVariables: (graph: GraphStructure) => {
    const edges = graph.edges()
    const stateVariables = new Set(graph.nodes().map((name) => graph.node(name)).filter((value) => !!value).filter((node) => "isState" in node && node.isState).map((node) => node.name))
    return edges.filter((edge) => stateVariables.has(edge.w)).map((edge) => graph.edge(edge.v, edge.w))
  },
  getNodesByNames: (graph: GraphStructure, names: string[]) => {
    return names.map((name) => graph.nodes().map((id) => graph.node(id)).filter((node) => node?.name?.startsWith(name)))
  },
  buildIntermediateGraphRepresentation: (ast: ReturnType<typeof parse>) => {
    const graph: GraphStructure = new Graph({
      directed: false,
      compound: true,
    });
    visit(ast, {
      ContractDefinition: (node) => {
        const typedNode = node as ContractDefinition
        const contractName = typedNode.name
        graph.setNode("contractName", {
          name: contractName,
          nodeType: "contractName"
        })
        const inheritance = typedNode.baseContracts
        inheritance.forEach((contract) => {
          const typedContract = contract as InheritanceSpecifier
          const contractName = typedContract.baseName.namePath
          graph.setNode(`inherit-${contractName}`, {
            name: contractName,
            nodeType: "inherit"
          })
        })
      },
      ModifierDefinition: (node) => {
        const typedNode = node as ModifierDefinition
        graph.setNode(`modifier-${typedNode.name}`, {
          name: typedNode.name,
          nodeType: "modifier"
        })
      },
      PragmaDirective: (node) => {
        const version = node.value
        if (version?.includes("^")) {
            const parsedVersion = version.trim().split("^")[1].split(".")
            graph.setNode("version", {
                type: "inexact",
                version: parsedVersion,
                nodeType: "version",
                loc: node.loc
            })
            return
        }
        if (version?.includes("<") || version?.includes(">")) {
            const noSpaces = version.trim().split(" ").join("")
            const hasUnstrictLeft = noSpaces.includes(">=")
            const hasUnstrictRight = noSpaces.includes("<=")
            if (hasUnstrictLeft) {
                const noLeft = noSpaces.split(">=")[1]
                if (hasUnstrictRight) {
                    const leftVersion = noLeft.split("<=")[0].split(".")
                    const rightVersion = noLeft.split("<=")[1].split(".")
                    graph.setNode("version", {
                        type: "interval",
                        leftVersion,
                        rightVersion,
                        nodeType: "version",
                        loc: node.loc
                    })
                } else {
                    const leftVersion = noLeft.split("<")[0].split(".")
                    const rightVersion = noLeft.split("<")[1].split(".")
                    graph.setNode("version", {
                        type: "interval",
                        leftVersion,
                        rightVersion,
                        nodeType: "version",
                        loc: node.loc
                    })
                }
            } else {
                const noLeft = noSpaces.split(">")[1]
                if (hasUnstrictRight) {
                    const leftVersion = noLeft.split("<=")[0].split(".")
                    const rightVersion = noLeft.split("<=")[1].split(".")
                    graph.setNode("version", {
                        type: "interval",
                        leftVersion,
                        rightVersion,
                        nodeType: "version",
                        loc: node.loc
                    })
                } else {
                    const leftVersion = noLeft.split("<")[0].split(".")
                    const rightVersion = noLeft.split("<")[1].split(".")
                    graph.setNode("version", {
                        type: "interval",
                        leftVersion,
                        rightVersion,
                        nodeType: "version",
                        loc: node.loc
                    })
                }
            }
            return
        }
        graph.setNode("version", {
            type: "exact",
            version: version.trim().split("."),
            nodeType: "version",
            loc: node.loc
        })
      },
      EventDefinition: (node) => {
        graph.setNode(node.name, {
          nodeType: "event",
          name: node.name,
          parameters: node.parameters.map((parameter) => parserService.parseVariableDeclaration(parameter)),
          loc: node.loc
        })
      },
      StateVariableDeclaration: (node) => {
        node.variables?.forEach((variableDeclaration) => {
          graph.setNode(variableDeclaration.name, {
            type: parserService.parseType(variableDeclaration.typeName),
            visibility: variableDeclaration.visibility,
            isState: variableDeclaration.isStateVar,
            nodeType: "variable",
            name: variableDeclaration.name,
            isConst: variableDeclaration.isDeclaredConst,
            loc: variableDeclaration.loc
          });
        });
      },
      FunctionDefinition: (node) => {
        graph.setNode(node.name, {
          name: node.name,
          type: node.type,
          parameters: node.parameters.map((parameter) => parserService.parseVariableDeclaration(parameter)),
          visibility: node.visibility,
          isConstructor: node.isConstructor,
          isReceiveEther: node.isReceiveEther,
          isFallback: node.isFallback,
          body: parserService.parseFunctionBody(node, graph),
          modifiers: node.modifiers,
          isVirtual: node.isVirtual,
          nodeType: "function",
          loc: node.loc
        });
        node.parameters?.forEach((parameter) => {
          graph.setNode(node.name + "_" + parameter.name, {
            type: (parameter.typeName as ElementaryTypeName).name,
            isState: parameter.isStateVar,
            isConst: false,
            nodeType: "function_parameter",
            name: parameter.name,
            loc: node.loc
          });

          graph.setEdge(
            node.name,
            node.name + "_" + parameter.name,
            "parameter"
          );
        });
      },
      UsingForDeclaration: (node) => {
        
        graph.setNode(
          node.libraryName + "_" + (node.typeName as ElementaryTypeName).name,
          {
            name: node.libraryName + "_" + (node.typeName as ElementaryTypeName).name,
            type: (node.typeName as ElementaryTypeName).name,
            nodeType: "using-for",
            loc: node.loc
          }
        );
      },
    });
    return graph;
  },
};
