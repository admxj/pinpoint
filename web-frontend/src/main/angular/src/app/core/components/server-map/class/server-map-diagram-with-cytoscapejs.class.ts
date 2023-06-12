import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import {from as fromOperator, fromEvent, iif, zip, merge, Observable, forkJoin} from 'rxjs';
import {mergeMap, map, pluck, switchMap, take, reduce, tap, filter} from 'rxjs/operators';

import ServerMapTheme from './server-map-theme';
import {ServerMapDiagram} from './server-map-diagram.class';
import {ServerMapData} from './server-map-data.class';
import {IServerMapOption} from './server-map-factory';
import {ServerMapTemplate} from './server-map-template';
import {isEmpty} from 'app/core/utils/util';

const enum GraphStyle {
    NODE_WIDTH = 100,
    NODE_HEIGHT = 100,
    NODE_RADIUS = GraphStyle.NODE_HEIGHT / 2,
    NODE_GAP = 30,
    RANK_SEP = 200
}

export class ServerMapDiagramWithCytoscapejs extends ServerMapDiagram {
    private cy: any;
    private addedNodes: any;
    protected computedStyle = getComputedStyle(document.body);
    protected serverMapColor = {
        text: this.computedStyle.getPropertyValue('--text-primary'),
        textFail: this.computedStyle.getPropertyValue('--status-fail'),
        textBackground: this.computedStyle.getPropertyValue('--background-primary'),
        nodeBackground: this.computedStyle.getPropertyValue('--server-map-node-background'),
        nodeBorderOutLine: this.computedStyle.getPropertyValue('--server-map-node-border-outline'),
    }

    constructor(
        private option: IServerMapOption
    ) {
        super();
        ServerMapTheme.general.common.funcServerMapImagePath = this.option.funcServerMapImagePath;
        this.makeDiagram();
    }

    private makeDiagram(): void {
        cytoscape.use(dagre);
        this.cy = cytoscape({
            container: this.option.container,
            elements: null,
            style: [
                {
                    selector: 'core',
                    style: {
                        'active-bg-size': 0,
                        // 'active-bg-color': PropertyValueCore<Colour>;
                        'active-bg-opacity': 0
                        // 'active-bg-size': PropertyValueCore<number>;
                        // 'selection-box-color': PropertyValueCore<Colour>;
                        // 'selection-box-border-color': PropertyValueCore<Colour>;
                        // 'selection-box-border-width': PropertyValueCore<number>;
                        // 'selection-box-opacity': PropertyValueCore<number>;
                        // 'outside-texture-bg-color': PropertyValueCore<Colour>;
                        // 'outside-texture-bg-opacity': PropertyValueCore<number>;
                    }
                },
                {
                    // TODO: Restructure ServerMapTheme and replace the style string with constant from it
                    selector: 'node',
                    style: {
                        width: GraphStyle.NODE_WIDTH,
                        height: GraphStyle.NODE_HEIGHT,
                        'background-color': this.serverMapColor.nodeBackground,
                        'border-width': '3',
                        'border-color': this.serverMapColor.nodeBorderOutLine,
                        'text-valign': 'bottom',
                        'text-halign': 'center',
                        'text-margin-y': 4,
                        'background-clip': 'node',
                        'background-image': (ele: any) => ele.data('imgArr'),
                        'background-fit': 'contain',
                        'background-offset-y': '-5px',
                        label: 'data(label)',
                        'overlay-opacity': 0,
                        'font-family': 'Helvetica, Arial, avn85, NanumGothic, ng, dotum, AppleGothic, sans-serif',
                        'font-size': (ele: any) => ele.id() === this.baseApplicationKey ? '14px' : '12px',
                        'font-weight': (ele: any) => ele.id() === this.baseApplicationKey ? 'bold' : 'normal',
                        'text-wrap': 'wrap',
                        'text-max-width': 200,
                        // 'text-overflow-wrap': 'anywhere',
                        // 'text-justification': 'left',
                        'line-height': 1.5,
                        color: this.serverMapColor.text,
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        width: 1.5,
                        'line-color': '#C0C3C8',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        // icon unicode: f0b0
                        label: 'data(label)',
                        // label: String.fromCharCode(0xe903),
                        // 'font-family': 'Font Awesome 5 Free',
                        // 'font-size': 13,
                        // 'font-weight': 900,
                        'text-background-color': this.serverMapColor.textBackground,
                        'text-background-opacity': 1,
                        // 'text-wrap': 'wrap',
                        // 'font-family': 'FontAwesome, helvetica neue',
                        // 'font-style': 'normal',
                        'overlay-opacity': 0,
                        color: (ele: any) => ele.data('hasAlert') ? this.serverMapColor.textFail : this.serverMapColor.text,
                    }
                },
                {
                    selector: 'edge:loop',
                    style: {
                        'control-point-step-size': 70,
                        'loop-direction': '0deg',
                        'loop-sweep': '-90deg'
                    }
                }
            ],
            wheelSensitivity: 0.2
        });
    }

    private bindEvent(): void {
        this.cy.on('layoutready', () => {
            if (!this.shouldRefresh) {
                // if (!this.isElementInDiagram(this.cy.elements(':selected').id())) {
                if (!this.isElementInDiagram(this.selectedElement.id())) {
                    this.selectElement(this.baseApplicationKey);
                    return;
                }

                return;
            }

            this.resetViewport();
            this.selectBaseApp();
            this.outRenderCompleted.emit();
        });

        this.cy.on('layoutstop', () => {
            // TODO: Add experimental flag
            // this.cy.nodes().unlock();
            // // Check overlay and adjust the position
            // const rootNodes = this.cy.nodes().roots().toArray();
            // const leafNodes = this.cy.nodes().leaves().toArray();

            // this.addedNodes.forEach((addedNode: any) => {
            //     const {y} = addedNode.position();
            //     const {h, y1} = addedNode.boundingBox();
            //     const labelHeight = h - (y - y1) * 2;
            //     const isRootNode = rootNodes.some((node: any) => node.id() === addedNode.id());
            //     const isLeafNode = leafNodes.some((node: any) => node.id() === addedNode.id());

            //     if (isRootNode || isLeafNode) {
            //         const sameTypeNodes = isRootNode ? rootNodes.filter((node: any) => node.id() !== addedNode.id())
            //             : leafNodes.filter((node: any) => node.id() !== addedNode.id());
            //         const newX = sameTypeNodes.reduce((acc: number, node: any) => {
            //             const {x} = node.position();

            //             return acc + x;
            //         }, 0) / sameTypeNodes.length;

            //         const overlayableNodes = this.cy.nodes().toArray().filter((node: any) => {
            //             return this.isXPosOverlaid(addedNode, node);
            //         });

            //         let newY1;

            //         if (Math.random() >= 0.5) {
            //             // Add at the top
            //             const topY = Math.min(...overlayableNodes.map((node: any) => node.boundingBox().y1));
            //             const newY2 = topY - GraphStyle.NODE_GAP;
                        
            //             newY1 = newY2 - h;
            //         } else {
            //             // Add at the bottom
            //             const bottomY = Math.max(...overlayableNodes.map((node: any) => node.boundingBox().y2));
                        
            //             newY1 = bottomY + GraphStyle.NODE_GAP;
            //         }

            //         const newY = (h - labelHeight) / 2 + newY1;

            //         addedNode.position({
            //             x: newX,
            //             y: newY
            //         });
            //     } else {
            //         const isOverlaid = this.cy.nodes().toArray().some((node: any) => addedNode.id() !== node.id() && this.areTheyOverlaid(addedNode, node));
    
            //         if (!isOverlaid) {
            //             return;
            //         }
    
            //         const {x, y} = addedNode.position();
            //         const {h, y1} = addedNode.boundingBox();
            //         const labelHeight = h - (y - y1) * 2;
    
            //         const nodesAtSameX = this.cy.nodes().filter((node: any) => {
            //             return x === node.position().x;
            //         });
            //         const topY = Math.min(...nodesAtSameX.map((node: any) => node.boundingBox().y1));
            //         const newY2 = topY - GraphStyle.NODE_GAP;
            //         const newY1 = newY2 - h;
            //         const newY = (h - labelHeight) / 2 + newY1;
    
            //         addedNode.position({
            //             x,
            //             y: newY
            //         });
            //     }
            // });
        });

        this.cy.on('select', 'node', ({target}: any) => {
            this.selectedElement = target;
            const nodeKey = target.id();
            const nodeData = this.getNodeData(nodeKey);

            if (!target.data('alive')) {
                return;
            }

            this.outClickNode.emit(nodeData);
            this.initStyle();
            this.setStyle(target, 'node');
        });

        this.cy.on('select', 'edge', ({target}: any) => {
            this.selectedElement = target;
            const edgeKey = target.id();
            const linkData = this.getLinkData(edgeKey);

            if (!target.data('alive')) {
                return;
            }

            this.outClickLink.emit(linkData);
            this.initStyle();
            this.setStyle(target, 'edge');
        });

        this.cy.on('cxttap', ({target, originalEvent}: any) => {
            const {clientX, clientY} = originalEvent;

            setTimeout(() => {
                if (target === this.cy) {
                    this.outContextClickBackground.emit({coordX: clientX, coordY: clientY});
                } else if (!this.isMergedElement(target) && target.data('alive')) {
                    target.isEdge() ? this.outContextClickLink.emit({
                            key: target.id(),
                            coord: {coordX: clientX, coordY: clientY}
                        })
                        : this.outContextClickNode.emit({key: target.id(), coord: {coordX: clientX, coordY: clientY}});
                }
            });
        });

        this.cy.on('mousemove', ({target}: any) => {
            this.setCursorStyle(target === this.cy ? 'default' : 'pointer');
        });

        this.cy.on('tapend', 'node', ({target}: any) => {
            this.outMoveNode.emit();
        });
    }

    setMapData(serverMapData: ServerMapData, baseApplicationKey: string, shouldRefresh: boolean): void {
        this.shouldRefresh = shouldRefresh;
        
        if (!shouldRefresh) {
            const prevNodeList = this.serverMapData.getNodeList();
            const prevNodeKeyList = prevNodeList.map(({key}: INodeInfo) => key);
            const currNodeList = serverMapData.getNodeList();
            const currNodeKeyList = currNodeList.map(({key}: INodeInfo) => key);

            const addedNodeList: INodeInfo[] = [];
            const updatedNodeList: INodeInfo[] = [];
            const removedNodeList: INodeInfo[] = [];

            const nodeList = [...prevNodeList, ...currNodeList.filter(({key}: INodeInfo) => !prevNodeKeyList.includes(key))];
            
            nodeList.forEach((node: INodeInfo) => { // node is prevNode
                const {key, histogram, instanceCount, isMerged} = node;
                const isRemoved = prevNodeKeyList.includes(key) && !currNodeKeyList.includes(key);
                const isAdded = !prevNodeKeyList.includes(key) && currNodeKeyList.includes(key);

                if (isRemoved) {
                    removedNodeList.push(node);
                } else if (isAdded) {
                    addedNodeList.push(node);
                } else {
                    if (isMerged) {
                        return;
                    }

                    const currNode = currNodeList.find(({key: currKey}: INodeInfo) => currKey === key);
                    const isSameInstanceCount = instanceCount === currNode.instanceCount;
                    const isSameHistogram = Object.entries(histogram).every(([k1, v1]: [string, number], i: number) => {
                        const [k2, v2] = Object.entries(currNode.histogram)[i];

                        return k1 === k2 && v1 === v2;
                    });

                    if (isSameInstanceCount && isSameHistogram) {
                        return;
                    }

                    updatedNodeList.push(currNode);
                }
            });

            const prevEdgeList = this.serverMapData.getLinkList();
            const currEdgeList = serverMapData.getLinkList();
            const {
                addedEdgeList,
                updatedEdgeList
            } = currEdgeList.reduce((acc: { [key: string]: ILinkInfo[] }, curr: ILinkInfo) => {
                const shouldUpdated = prevEdgeList.some(({key}: ILinkInfo) => key === curr.key);

                shouldUpdated ? acc.updatedEdgeList.push(curr) : acc.addedEdgeList.push(curr);
                return acc;
            }, {addedEdgeList: [], updatedEdgeList: []});

            const addedNodes$ = this.getNodesObs(addedNodeList);
            const updateNodes$ = this.getNodesObs(updatedNodeList);

            forkJoin(
                addedNodes$,
                updateNodes$.pipe(
                    tap((nodes: { [key: string]: any }[]) => {
                        nodes.forEach(({data: {id, imgArr}}: { [key: string]: any }) => {
                            this.cy.getElementById(id).data({imgArr, alive: true}); 
                        });

                        updatedEdgeList.forEach(({key, totalCount, hasAlert}: { [key: string]: any }) => {
                            const linkData = serverMapData.getLinkData(key);
                            const responseInfo = this.getResponseInfo(linkData);

                            this.cy.getElementById(key).data({
                                    label: `${totalCount.toLocaleString()}${responseInfo}`,
                                    hasAlert,
                                    alive: true
                                }
                            );
                        });
                    })
                )
            ).pipe(
                tap(() => {
                    this.cy.nodes().forEach((ele: any) => {
                        const nodeKey = ele.id();
                        const isRemovedNode = removedNodeList.some(({key}: { [key: string]: any }) => key === nodeKey);

                        if (!isRemovedNode) {
                            return;
                        }

                        if (this.isMergedElement(ele)) {
                            this.cy.remove(ele);
                        } else {
                            ele.data({alive: false});
                            ele.connectedEdges().forEach((edge: any) => {
                                edge.data({label: 0, alive: false});
                                edge.removeAllListeners();
                            });

                            ele.removeAllListeners();
                        }
                    });
                }),
                map(([nodes, _]: { [key: string]: any }[][]) => {
                    const edges = addedEdgeList.map((edge: { [key: string]: any }) => {
                        const {from, to, key, totalCount, hasAlert, isMerged} = edge;
                        const linkData = serverMapData.getLinkData(key);
                        const responseInfo = this.getResponseInfo(linkData);

                        return {
                            data: {
                                id: key,
                                source: from,
                                target: to,
                                isMerged,
                                label: `${totalCount.toLocaleString()}${responseInfo}`,
                                hasAlert,
                                alive: true
                            }
                        };
                    });

                    return {nodes, edges};
                }),
                tap((elements: { [key: string]: any }) => {
                    this.addedNodes = this.cy.add(elements).nodes();
                }),
                // filter(() => !isEmpty(this.addedNodes))
                filter(() => !this.addedNodes.empty())
            ).subscribe((elements: {[key: string]: any}) => {
                console.log('node 추가!');
                console.log(this.addedNodes.map((node: any) => node.id()));
                // TODO: Add experimental option
                // this.cy.nodes().lock();
                // this.initLayout();
                // this.adjustStyle(elements);

                // this.updateLayout();
                // this.updateLayoutWithRank();
                this.updateLayoutWithoutRank();
                this.adjustStyle(elements);
            });
        } else {
            // * Update Entirely
            const edgeList = serverMapData.getLinkList();
            const edges = edgeList.map((link: ILinkInfo) => {
                const {from, to, key, totalCount, isFiltered, isMerged, hasAlert} = link;
                const linkData = serverMapData.getLinkData(key);
                const responseInfo = this.getResponseInfo(linkData);

                return {
                    data: {
                        id: key,
                        source: from,
                        target: to,
                        isMerged,
                        // [임시]label에서 이미지를 지원하지않아서, filteredMap페이지에서 필터아이콘을 "Filtered" 텍스트로 대체.
                        // label: isFiltered ? ` [Filtered]\n${totalCount.toLocaleString()} ` : ` ${totalCount.toLocaleString()} `,
                        // TODO: Filter Icon 처리
                        label: `${totalCount.toLocaleString()}${responseInfo}`,
                        hasAlert,
                        alive: true
                    }
                };
            });

            const nodeList = serverMapData.getNodeList();
            const nodes$ = this.getNodesObs(nodeList);

            nodes$.subscribe((nodes: { [key: string]: any }[]) => {
                this.cy.elements().remove();
                this.cy.removeAllListeners();
                this.cy.add({nodes, edges});
                this.bindEvent();
                this.initLayout();
            });
        }

        this.serverMapData = serverMapData;
        this.baseApplicationKey = baseApplicationKey;
    }

    private updateLayoutWithoutRank(): void {
        const centerNode = this.cy.getElementById(this.baseApplicationKey);
        const {x: centerNodeX, y: centerNodeY} = centerNode.position();
        const {y1: centerNodeY1, y2: centerNodeY2} = centerNode.boundingBox();
        let rankDiff: number; // Indicates rank diff between added node and the center node

        this.addedNodes.forEach((addedNode: any) => {
            rankDiff = 0;
            const predecessors = addedNode.predecessors();
            const successors = addedNode.successors();

            const hasIncomers = predecessors.contains(centerNode); // or hasOutgoers
            const traverseTarget = hasIncomers ? predecessors : successors;

            rankDiff = traverseTarget.nodes().toArray().findIndex((ele: any) => ele.id() === this.baseApplicationKey) + 1;
            const newX = centerNodeX + (rankDiff * (GraphStyle.RANK_SEP + GraphStyle.NODE_WIDTH) * (hasIncomers ? 1 : -1));

            const {y} = addedNode.position();
            const {h, y1} = addedNode.boundingBox();
            const labelHeight = h - (y - y1) * 2;

            const overlayableNodes = this.cy.nodes().filter((node: any) => {
                const isSameNode = node.same(addedNode);
                const {x} = node.position();
                const width = node.width();
                const isXPosOverlaid = Math.abs(newX - x) <= width;

                return !isSameNode && isXPosOverlaid;
            });

            let newY1;

            if (Math.random() >= 0.5) {
                // Add at the top
                const topY = Math.min(...overlayableNodes.map((node: any) => node.position().y - GraphStyle.NODE_RADIUS), centerNodeY - GraphStyle.NODE_RADIUS);
                const newY2 = topY - GraphStyle.NODE_GAP;
                
                newY1 = newY2 - h;
            } else {
                // Add at the bottom
                const bottomY = Math.max(...overlayableNodes.map((node: any) => node.boundingBox().y2), centerNodeY2);
                
                newY1 = bottomY + GraphStyle.NODE_GAP;
            }

            const newY = (h - labelHeight) / 2 + newY1;

            addedNode.position({
                x: newX,
                y: newY
            });
        })
    }

    private getResponseInfo(linkData: ILinkInfo | any): any {
        if (typeof linkData === 'undefined' || !linkData) {
            return '';
        }

        const histogram_avg = linkData.responseStatistics ? linkData.responseStatistics.Avg : 0;

        return histogram_avg > 0 ? ` (${this.formatTime(histogram_avg)})` : '';
    }

    private formatTime(val: number): string {
        return val < 1000 ? `${val} ms`
            : val % 60000 === 0 ? `${(val / 60000)} min`
                : `${(val / 1000.0).toFixed(2).replace('.00', '').replace(/(\.\d)0$/, '$1')} sec`;
    }

    private getMergedNodeLabel(topCountNodes: { [key: string]: any }[]): string {
        return topCountNodes[0].applicationName;
    }

    private getNodesObs(nodeList: INodeInfo[]): Observable<{[key: string]: any}[]> {
        return fromOperator(nodeList).pipe(
            mergeMap((node: { [key: string]: any }) => {
                const {key, applicationName, serviceType, isAuthorized, hasAlert, isMerged, topCountNodes} = node;
                const serviceTypeImg = new Image();

                serviceTypeImg.src = ServerMapTheme.general.common.funcServerMapImagePath(serviceType);

                const serviceTypeImgLoadEvent$ = merge(
                    fromEvent(serviceTypeImg, 'load').pipe(
                        tap(({target}: { target: EventTarget }) => {
                            // const img = target as HTMLImageElement;

                            // img.width = img.width <= 100 ? img.width : 100;
                            // img.height = img.height <= 65 ? img.height : 65;
                        }),
                    ),
                    fromEvent(serviceTypeImg, 'error').pipe(
                        switchMap(() => {
                            // If there is no image file for a serviceType, use NO_IMAGE_FOUND image file instead.
                            const tempImg = new Image();

                            tempImg.src = ServerMapTheme.general.common.funcServerMapImagePath('NO_IMAGE_FOUND');
                            return fromEvent(tempImg, 'load');
                        })
                    )
                );
                const innerObs$ = iif(() => hasAlert && isAuthorized,
                    (() => {
                        const alertImg = new Image();

                        alertImg.src = ServerMapTheme.general.common.funcServerMapImagePath(ServerMapTheme.general.common.icon.error);
                        return zip(
                            serviceTypeImgLoadEvent$.pipe(pluck('target')),
                            fromEvent(alertImg, 'load').pipe(pluck('target'))
                        );
                    })(),
                    serviceTypeImgLoadEvent$.pipe(map((v: Event) => [v.target]))
                );
                return innerObs$.pipe(
                    map(([serviceTypeImgElem, _]: HTMLImageElement[]) => {
                        // [serviceTypeImgElem, alertImg]
                        // TODO: alertImg should be considered later
                        const svg = ServerMapTemplate.getSVGString(node);

                        return [
                            serviceTypeImgElem.src,
                            'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
                        ];
                    }),
                    map((imgArr: string[]) => {
                        return {
                            data: {
                                id: key,
                                isMerged,
                                // label: isMerged ? this.getMergedNodeLabel(topCountNodes) : `${applicationName}` + ` ${instanceCount !== 0 ? '(' + instanceCount + ')' : ''}`,
                                label: isMerged ? this.getMergedNodeLabel(topCountNodes) : applicationName,
                                imgArr,
                                alive: true
                            },
                        };
                    })
                );
            }),
            take(nodeList.length),
            reduce((acc: { [key: string]: any }[], curr: { [key: string]: any }) => {
                return [...acc, curr];
            }, [])
        );
    }

    private isMergedElement(ele: any): boolean {
        return ele.data('isMerged');
    }

    private isXPosOverlaid(ele1: any, ele2: any): boolean {
        const ele1Width = ele1.width();
        const {x1, x2} = ele1.boundingBox();
        const {x1: x3, x2: x4} = ele2.boundingBox();

        return x4 >= x1 && x3 <= x2;
    }

    private areTheyOverlaid(ele1: any, ele2: any): boolean {
        const {x1, x2, y1, y2} = ele1.boundingBox();
        const {x1: x3, x2: x4, y1: y3, y2: y4} = ele2.boundingBox();

        return ((x1 <= x3 && x3 <= x2) || (x1 <= x4 && x4 <= x2) || (x3 <= x1 && x4 >= x2)) &&
            ((y1 <= y3 && y3 <= y2) || (y1 <= y4 && y4 <= y2) || (y3 <= y1 && y4 >= y2));
    }

    private getNodeData(key: string): INodeInfo {
        return this.serverMapData.getNodeData(key);
    }

    private getLinkData(key: string): ILinkInfo {
        return this.serverMapData.getLinkData(key);
    }

    private isElementInDiagram(key: string): boolean {
        return this.cy.getElementById(key).inside();
    }

    private setCursorStyle(cursorStyle: string): void {
        this.option.container.style.cursor = cursorStyle;
    }

    private resetViewport(): void {
        this.cy.zoom(1);
        this.cy.center(this.cy.getElementById(this.baseApplicationKey));
    }

    private selectBaseApp(): void {
        this.selectElement(this.baseApplicationKey);
    }

    private selectElement(key: string): void {
        // this.cy.getElementById(key).select();
        this.cy.getElementById(key).emit('select');
    }

    private initStyle(): void {
        this.cy.nodes().style(this.getInActiveNodeStyle());
        this.cy.edges().style(this.getInActiveEdgeStyle());
    }

    private setStyle(target: any, type: string): void {
        if (type === 'node') {
            target.style(this.getActiveNodeStyle());
            target.connectedEdges().style(this.getActiveEdgeStyle());
        } else {
            target.style(this.getActiveEdgeStyle());
            target.connectedNodes().style(this.getActiveNodeStyle());
        }
    }

    private getInActiveNodeStyle(): { [key: string]: any } {
        return {
            'border-color': this.serverMapColor.nodeBorderOutLine,
        };
    }

    private getInActiveEdgeStyle(): { [key: string]: any } {
        return {
            'font-size': '12px',
            'font-weight': 'normal',
            'line-color': '#C0C3C8',
            'target-arrow-color': '#C0C3C8'
        };
    }

    private getActiveNodeStyle(): { [key: string]: any } {
        return {
            'border-color': '#4A61D1',
        };
    }

    private getActiveEdgeStyle(): { [key: string]: any } {
        return {
            'font-size': '14px',
            'font-weight': 'bold',
            'line-color': '#4763d0',
            'target-arrow-color': '#4763d0'
        };
    }

    private adjustStyle({nodes, edges}: { [key: string]: any[] }): void {
        if (nodes.length === 0) {
            return;
        }

        // Use it after clarifying the select event.
        // const selectedElement = this.cy.elements(':selected');
        this.setStyle(this.selectedElement, this.selectedElement.isNode() ? 'node' : 'edge');
    }

    private initLayout(): void {
        this.cy.layout({
            name: 'dagre',
            rankDir: 'LR',
            fit: false,
            rankSep: GraphStyle.RANK_SEP,
        }).run();
    }

    redraw(): void {
        this.setMapData(this.serverMapData, this.baseApplicationKey, this.shouldRefresh);
    }

    refresh(): void {
        this.resetViewport();
        this.selectBaseApp();
        this.initLayout();
    }

    clear(): void {
        this.cy.destroy();
    }

    selectNodeBySearch(selectedAppKey: string): void {
        let selectedNodeId = selectedAppKey;
        const isMergedNode = !this.isElementInDiagram(selectedAppKey);

        if (isMergedNode) {
            const selectedMergedNode = this.serverMapData.getNodeList().find(({isMerged, mergedNodes}: INodeInfo) => {
                return isMerged && mergedNodes.some(({key}: any) => key === selectedAppKey);
            });

            selectedNodeId = selectedMergedNode.key;
        }

        this.cy.center(this.cy.getElementById(selectedNodeId));
        this.selectElement(selectedNodeId);
    }
}
