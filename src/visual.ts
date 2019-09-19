/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict";

import "core-js/stable";
import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;
import * as d3 from "d3";
import { VisualSettings } from "./settings";
import { xml } from "d3";

type Selection<T extends d3.BaseType> = d3.Selection<T, any, any, any>;

interface DataPoint {
    category: string;
    value: number;
}

interface ViewModel {
    dataPoints: DataPoint[];
    maxValue: number;
}

export class Visual implements IVisual {
    private target: HTMLElement;
    private updateCount: number;
    private viewModel: ViewModel;
    private textNode: Text;
    private host: IVisualHost;
    private locale: string;
    private svg: Selection<SVGElement>;
    private barGroup: Selection<SVGElement>;
    private pBarGroup: Selection<SVGElement>;
    private labelGroup: Selection<SVGElement>;
    private dLabelGroup: Selection<SVGElement>;
    private pLabelGroup: Selection<SVGElement>;
    private xPadding: number = 0.2;
    private xAxisGroup: Selection<SVGElement>;
    private settings = {
        axis: {
            x: {
                padding: 50
            },

            y: {
                padding: 50
            }
        }
    };

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.locale = this.host.locale;
        this.svg = d3.select(options.element)
            .append('svg')
            .classed('bar-chart', true);
        this.barGroup = this.svg.append('g')
            .classed('bar-group', true);
        this.pBarGroup = this.svg.append('g')
            .classed('p-bar-group', true);
        this.labelGroup = this.svg.append('g')
            .classed('label-group', true);
        this.dLabelGroup = this.svg.append('g')
            .classed('d-label-group', true);
        this.pLabelGroup = this.svg.append('g')
            .classed('p-label-group', true);
        this.xAxisGroup = this.svg.append('g')
            .classed('x-axis', true);
    }

    public update(options: VisualUpdateOptions) {

        //
        // VIEW SETUP
        //
        this.viewModel = this.getViewModel(options);

        let width: number = options.viewport.width;
        let height: number = options.viewport.height;

        this.svg.attr('width', width);
        this.svg.attr('height', height);

        let yScale = d3.scaleLinear()
            .domain([0, this.viewModel.maxValue])
            .range([height - this.settings.axis.x.padding, height * 0.2]);

        let xScale = d3.scaleBand()
            .domain(this.viewModel.dataPoints.map(data => data.category))
            .rangeRound([0, width])
            .padding(this.xPadding);

        let xAxis = d3.axisBottom(xScale)
            .scale(xScale)
            .tickSize(1);

        this.xAxisGroup
            .call(xAxis)
            .attr('transform', `translate(0, ${height - this.settings.axis.x.padding})`);

        //
        // BARS
        //
        let bars = this.barGroup
            .selectAll('.bar')
            .data(this.viewModel.dataPoints);
        bars.enter()
            .append('rect')
            .classed('bar', true)
            .attr('width', xScale.bandwidth())
            .attr('height', (d) => height - yScale(d.value) - this.settings.axis.x.padding)
            .attr('x', (d) => xScale(d.category))
            .attr('y', (d) => yScale(d.value))
            .style('fill', 'rgb(57, 123, 180)');
        bars
            .attr('width', xScale.bandwidth())
            .attr('height', (d) => height - yScale(d.value) - this.settings.axis.x.padding)
            .attr('x', (d) => xScale(d.category))
            .attr('y', (d) => yScale(d.value));
        bars.exit().remove();

        //
        // BARS - PERCENTAGE
        //
        let pBars = this.pBarGroup
            .selectAll('.pbar')
            .data(this.viewModel.dataPoints);
        pBars.enter()
            .append('rect')
            .classed('pbar', true)
            .attr('width', xScale.bandwidth() - (width * 0.02))
            .attr('height', (d) => height * 0.055)
            .attr('x', (d) => xScale(d.category) + xScale.bandwidth() / (2 - this.xPadding) + (width * 0.015))
            .attr('y', (d) => height - this.settings.axis.x.padding - (height * 0.065))
            .attr('rx', 5)
            .attr('ry', 5)
            .style('fill', 'rgba(220, 0, 0, 0.623)')
            .style('position', 'relative')
            .style('display', (d, i) => {
                return (this.viewModel.dataPoints[i + 1])
                    ? 'block'
                    : 'none';
            });
        pBars
            .attr('width', xScale.bandwidth() - (width * 0.02))
            .attr('height', (d) => height * 0.055)
            .attr('x', (d) => xScale(d.category) + xScale.bandwidth() / (2 - this.xPadding) + (width * 0.015))
            .attr('y', (d) => height - this.settings.axis.x.padding - (height * 0.065));

        //
        // LABELS - DIFFERENCE IN PERCENTAGE
        //
        let pLabels = this.pLabelGroup
            .selectAll('.plabel')
            .data(this.viewModel.dataPoints);
        pLabels.enter()
            .append('text')
            .classed('plabel', true)
            .text((d, i) => {
                const data = this.viewModel.dataPoints;
                if (data[i + 1]) {
                    let diff: number;
                    let pDiff: number;
                    let trimmedDiff: string;

                    if (data[i + 1].value < d.value) {
                        diff = (data[i + 1].value / d.value) * 100;
                        pDiff = 100 - diff;
                        trimmedDiff = pDiff.toString().slice(0, 4);
                        return `-${trimmedDiff}%`;
                    }

                    // if (data[i + 1].value > d.value) {
                    //     diff = (d)
                    // }
                }
                return '';
            })
            .attr('x', (d) => xScale(d.category) + xScale.bandwidth() + (width * 0.008))
            .attr('y', (d) => height - this.settings.axis.x.padding - (height * 0.027))
            .style('position', 'absolute')
            .style('font-size', (d) => `${height * 0.0016}rem`)
            .style('text-anchor', 'middle')
            .style('fill', 'white')
            .style('z-index', 100)
            .style('display', (d, i) => {
                return (this.viewModel.dataPoints[i + 1])
                    ? 'inline-block'
                    : 'none';
            });
        pLabels
            .attr('x', (d) => xScale(d.category) + xScale.bandwidth() + (width * 0.008))
            .attr('y', (d) => height - this.settings.axis.x.padding - (height * 0.027))
            .style('font-size', (d) => `${height * 0.0016}rem`);


        //
        // lABELS - PERCENTAGE
        //
        let labels = this.labelGroup
            .selectAll('.v-label')
            .data(this.viewModel.dataPoints);
        labels.enter()
            .append('text')
            .classed('v-label', true)
            .text((d) => {
                // finds the difference between the initial data value and the current data value
                // then the difference is converted to a string
                let diffFromMax = ((d.value / this.viewModel.dataPoints[0].value) * 100).toString();
                if (diffFromMax !== '100') {
                    diffFromMax = diffFromMax.slice(0, 2);
                }
                if (diffFromMax[1] === '.') {
                    diffFromMax = diffFromMax.slice(0, 1);
                }
                else {
                    diffFromMax = diffFromMax.slice(0, 3);
                }
                return `${diffFromMax}%`;
            })
            .attr('x', (d) => xScale(d.category) + (xScale.bandwidth() / 2))
            .attr('y', (d) => yScale(d.value) - (height * 0.01))
            .attr("text-anchor", "middle")
            .style('font-size', '0.9em');
        labels
            .attr('x', (d) => xScale(d.category) + (xScale.bandwidth() / 2))
            .attr('y', (d) => yScale(d.value) - (height * 0.01))
            .attr("text-anchor", "middle");
        labels.exit().remove();

        //
        // LABELS - DATA
        //
        let dLabels = this.labelGroup
            .selectAll('.d-label')
            .data(this.viewModel.dataPoints);
        dLabels.enter()
            .append('text')
            .classed('d-label', true)
            .text((d) => {
                let dPoint = d.value.toString();
                dPoint.split('').map((char, i) => {
                    if (char === '.') {
                        dPoint = dPoint.slice(0, i);
                    }
                });
                return `${dPoint}M`;
            })
            .attr('x', (d) => xScale(d.category) + (xScale.bandwidth() / 2))
            .attr('y', (d) => yScale(d.value) - 23)
            .attr("text-anchor", "middle")
            .style('font-weight', '500')
            .style('fill', 'rgb(57, 123, 180)');
        dLabels
            .attr('x', (d) => xScale(d.category) + (xScale.bandwidth() / 2))
            .attr('y', (d) => yScale(d.value) - 23)
            .attr("text-anchor", "middle");
        dLabels.exit().remove();


    }

    private getViewModel(options: VisualUpdateOptions): ViewModel {
        let dv = options.dataViews;
        let viewModel: ViewModel = {
            dataPoints: [],
            maxValue: 0
        };
        if (!dv
            || !dv[0]
            || !dv[0].categorical
            || !dv[0].categorical.categories
            || !dv[0].categorical.categories[0].source
            || !dv[0].categorical.values) {
            return viewModel;
        }
        let view = dv[0].categorical;
        let categories = view.categories[0];
        let values = view.values[0];

        for (let i = 0, len = Math.max(categories.values.length, values.values.length); i < len; i++) {
            viewModel.dataPoints.push({
                category: <string>categories.values[i],
                value: <number>values.values[i]
            });
        }

        viewModel.maxValue = d3.max(viewModel.dataPoints, d => d.value);

        return viewModel;
    }

    private static parseSettings(dataView: DataView): VisualSettings {
        return VisualSettings.parse(dataView) as VisualSettings;
    }

    /**
     * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the
     * objects and properties you want to expose to the users in the property pane.
     *
     */
    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
        return VisualSettings.enumerateObjectInstances(VisualSettings.getDefault(), options);
    }
}