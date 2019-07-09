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

        function visitInterfaceDeclaration(node: InterfaceDeclaration): VisitResult<Node> {

            let classMembers: ClassElement[] = [createConstructor(undefined, undefined, [],
                //调用或new 会触发异常
                createBlock([
                    createThrow(
                        createNew(
                            createIdentifier("Error"), undefined, []))])),

            //增加一个__interface的静态属性
            createProperty(undefined,
                [createToken(SyntaxKind.StaticKeyword)],
                "__interface", undefined,
                createKeywordTypeNode(SyntaxKind.BooleanKeyword),
                createIdentifier("true"))];

            //     switch (member.kind) {
            //         case SyntaxKind.PropertySignature:
            //             classMembers.push(createProperty(
            //                 member.decorators,
            //                 member.modifiers,
            //                 (<PropertySignature>member).name,
            //                 (<PropertySignature>member).questionToken,
            //                 (<PropertySignature>member).type,
            //                 <Expression>createIdentifier( "undefined")));//prop如果没有初始化值将不会显示
            //             break;
            //         case SyntaxKind.MethodSignature:
            //             classMembers.push(createMethod(
            //                 member.decorators,
            //                 member.modifiers,
            //                 undefined,
            //                 (<MethodSignature>member).name,
            //                 (<MethodSignature>member).questionToken,
            //                 (<MethodSignature>member).typeParameters,
            //                 (<MethodSignature>member).parameters,
            //                 (<MethodSignature>member).type,
            //                 createBlock([])));//如果不设置block同样不显示
            //             break;
            //     }
            // }

            return createClassDeclaration(node.decorators, node.modifiers, node.name, node.typeParameters, node.heritageClauses, createNodeArray<ClassElement>(classMembers));

        }

    }
}
