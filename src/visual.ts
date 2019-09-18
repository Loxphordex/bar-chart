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
        this.xAxisGroup = this.svg.append('g')
            .classed('x-axis', true);
    }

    public update(options: VisualUpdateOptions) {

        this.viewModel = this.getViewModel(options);

        let width: number = options.viewport.width;
        let height: number = options.viewport.height;

        this.svg.attr('width', width);
        this.svg.attr('height', height);

        let yScale = d3.scaleLinear()
            .domain([0, this.viewModel.maxValue])
            .range([height - this.settings.axis.x.padding, 0]);

        let xScale = d3.scaleBand()
            .domain(this.viewModel.dataPoints.map(data => data.category))
            .range([0, width])
            .padding(this.xPadding);

        let xAxis = d3.axisBottom(xScale)
            .scale(xScale)
            .tickSize(1);

        this.xAxisGroup
            .call(xAxis)
            .attr('transform', `translate(0, ${height - this.settings.axis.x.padding})`);

        let band = xScale.bandwidth();
        console.log(band);


        let bars = this.barGroup
            .selectAll('.bar')
            .data(this.viewModel.dataPoints);

        bars.enter()
            .append('rect')
            .classed('bar', true)
            .attr('width', band)
            .attr('height', (d) => height - yScale(d.value) - this.settings.axis.x.padding)
            .attr('x', (d, i) => {
                return xScale(d.category);
            })
            .attr('y', (d) => yScale(d.value))
            .style('fill', 'blue');

        bars
            .attr('width', band)
            .attr('height', (d) => height - yScale(d.value) - this.settings.axis.x.padding)
            .attr('x', (d, i) => {
                return xScale(d.category);
            })
            .attr('y', (d) => yScale(d.value));

        bars.exit().remove();

        // bars.selectAll('text')
        //     .data(this.viewModel.dataPoints)
        //     .enter()
        //     .append('text')
        //     .text((d, i) => `${options.viewport.width}`)
        //     .attr('x', (d, i) => i * 30)
        //     .attr('y', (d, i) => height - (3 * d.value) - 3);
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