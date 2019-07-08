/*@internal*/
namespace ts {
    export function transformFR(context: TransformationContext) {
        return chainBundle(transformSourceFile);

        function transformSourceFile(node: SourceFile) {
            if (node.isDeclarationFile) {
                return node;
            }

            return visitEachChild(node, visitor, context);
        }

        function visitor(node: Node): VisitResult<Node> {
            switch (node.kind) {
                case SyntaxKind.InterfaceDeclaration:
                    return visitInterfaceDeclaration(<InterfaceDeclaration>node);
                default:
                    return visitEachChild(node, visitor, context);
            }
        }

        function visitInterfaceDeclaration(node: InterfaceDeclaration ):VisitResult<Node>{
            console.log(node);
            var result = createClassDeclaration(node.decorators,node.modifiers,node.name,node.typeParameters,node.heritageClauses,[]);
            for (var member of node.members){
            
            }


        }

    }
}
