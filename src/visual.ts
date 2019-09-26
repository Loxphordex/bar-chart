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
    order?: number;
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
        console.log('updated');
        //
        // ** VIEW SETUP
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
        // ** BARS
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
        // ** BARS - PERCENTAGE
        //
        let pBars = this.pBarGroup
            .selectAll('.pbar')
            .data(this.viewModel.dataPoints);
        pBars.enter()
            .append('rect')
            .classed('pbar', true)
            .attr('width', (xScale.bandwidth() / 4) + 20)
            .attr('height', (d) => (d.value) ? 30 : 0)
            .attr('x', (d) => xScale(d.category) + xScale.bandwidth() - 10)
            .attr('y', (d) => height - this.settings.axis.x.padding - 40)
            .attr('rx', 5)
            .attr('ry', 5)
            .style('fill', 'rgba(220, 0, 0, 0.623)')
            .style('position', 'relative')
            .style('display', (d, i) => {
                // remove the last percentage bar
                return (this.viewModel.dataPoints[i + 1])
                    ? 'block'
                    : 'none';
            });
        pBars
            .attr('width', (xScale.bandwidth() / 4) + 20)
            .attr('height', (d) => (d.value) ? 30 : 0)
            .attr('x', (d) => xScale(d.category) + xScale.bandwidth() - 10)
            .attr('y', (d) => height - this.settings.axis.x.padding - 40);
        pBars.exit().remove();

        //
        // ** LABELS - DIFFERENCE IN PERCENTAGE
        //
        let pLabels = this.pLabelGroup
            .selectAll('.plabel')
            .data(this.viewModel.dataPoints);
        pLabels.enter()
            .append('text')
            .classed('plabel', true)
            .text((d, i) => this.calcPercentDiff(d, i))
            .attr('x', (d) => xScale(d.category) + xScale.bandwidth() + (xScale.bandwidth() / 8))
            .attr('y', (d) => height - this.settings.axis.x.padding - 20)
            .style('position', 'absolute')
            .style('font-size', '0.85em')
            .style('text-anchor', 'middle')
            .style('fill', 'white')
            .style('z-index', 100)
            .style('display', (d, i) => {
                return (this.viewModel.dataPoints[i + 1])
                    ? 'inline-block'
                    : 'none';
            });
        pLabels
            .text((d, i) => this.calcPercentDiff(d, i))
            .attr('x', (d) => xScale(d.category) + xScale.bandwidth() + (xScale.bandwidth() / 8))
            .attr('y', (d) => height - this.settings.axis.x.padding - 20);
        pLabels.exit().remove();


        //
        // ** lABELS - PERCENTAGE
        //
        let labels = this.labelGroup
            .selectAll('.v-label')
            .data(this.viewModel.dataPoints);
        labels.enter()
            .append('text')
            .classed('v-label', true)
            .text((d) => this.getPercentageLabels(d))
            .attr('x', (d) => xScale(d.category) + (xScale.bandwidth() / 2))
            .attr('y', (d) => yScale(d.value) - (height * 0.01))
            .attr("text-anchor", "middle")
            .style('font-size', '0.9em');
        labels
            .text((d) => this.getPercentageLabels(d))
            .attr('x', (d) => xScale(d.category) + (xScale.bandwidth() / 2))
            .attr('y', (d) => yScale(d.value) - (height * 0.01))
            .attr("text-anchor", "middle");
        labels.exit().remove();

        //
        // ** LABELS - DATA
        //
        let dLabels = this.labelGroup
            .selectAll('.d-label')
            .data(this.viewModel.dataPoints);
        dLabels.enter()
            .append('text')
            .classed('d-label', true)
            .text((d) => this.getDataLabels(d))
            .attr('x', (d) => xScale(d.category) + (xScale.bandwidth() / 2))
            .attr('y', (d) => (d.value) ? yScale(d.value) - 23 : 0)
            .attr("text-anchor", "middle")
            .style('font-size', '1.05em')
            .style('font-weight', '500')
            .style('fill', 'rgb(57, 123, 180)');
        dLabels
            .text((d) => this.getDataLabels(d))
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

    private calcPercentDiff(d: DataPoint, i: number) {
        if (!d.value) return '';
        const data = this.viewModel.dataPoints;
        if (data[i + 1]) {
            /**
             * To calculate the difference in percentage
             * between data points:
             * Numerator: next data point minus current data point
             * Denominator: absolute value of current data point
             * Divide numerator by denominator
             * Multiply result by 100
             * Limit the maximum decimal points to 2.
             */
            let d1 = d.value;
            let d2 = data[i + 1].value;
            let num = d2 - d1;
            let den = Math.abs(d1);
            let difference = (num / den) * 100;
            let formattedDif = difference.toFixed(2);

            if (data[i + 1].value < d.value) {
                return `${formattedDif}%`;
            }

            if (data[i + 1].value > d.value) {
                return `+${formattedDif}%`;
            }

            if (data[i + 1].value === d.value) return '+0.00%';
        }
        return '';
    }

    private getDataLabels(d: DataPoint) {
        let dPoint = d.value.toFixed();

        // unit assignment
        if (dPoint.length < 4) return dPoint;
        if (dPoint.length === 4) return `${dPoint[0]},${dPoint.slice(1)}`;
        if (dPoint.length === 5) return `${dPoint.slice(0, 2)}.${dPoint.slice(2, 3)}K`;
        if (dPoint.length === 6) return `${dPoint.slice(0, 3)}.${dPoint.slice(3, 4)}K`;
        if (dPoint.length === 7) return `${dPoint.slice(0, 1)}.${dPoint.slice(1, 2)}M`;
        if (dPoint.length === 8) return `${dPoint.slice(0, 2)}.${dPoint.slice(2, 3)}M`;
        if (dPoint.length === 9) return `${dPoint.slice(0, 3)}.${dPoint.slice(3, 4)}M`;
        if (dPoint.length === 10) return `${dPoint.slice(0, 1)}.${dPoint.slice(1, 2)}B`;
        if (dPoint.length === 11) return `${dPoint.slice(0, 2)}.${dPoint.slice(2, 3)}B`;
        if (dPoint.length === 12) return `${dPoint.slice(0, 3)}.${dPoint.slice(3, 4)}B`;
        if (dPoint.length === 13) return `${dPoint.slice(0, 1)}.${dPoint.slice(1, 2)}T`;
        return dPoint;
    }

    private getPercentageLabels(d: DataPoint) {
        // finds the difference between the initial data value and the current data value
        // then the difference is converted to a string
        let max = d3.max(this.viewModel.dataPoints.map(data => data.value));
        let diffFromMax = ((d.value / max) * 100);
        return `${Math.round(diffFromMax)}%`;
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