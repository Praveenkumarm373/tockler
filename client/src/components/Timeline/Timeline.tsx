import * as React from 'react';

import {
    VictoryChart,
    VictoryBrushContainer,
    VictoryBar,
    VictoryAxis,
    VictoryZoomContainer,
    VictoryTooltip,
} from 'victory';
import { Popover, Spin } from 'antd';
import moment from 'moment';

import 'moment-duration-format';

import debounce from 'lodash/debounce';
import { chartTheme, blueGrey700, disabledGrey } from './ChartTheme';
import { TrackItemType } from '../../enum/TrackItemType';
import { MainChart, BrushChart, Spinner } from './Timeline.styles';
import { TimelineItemEditContainer } from './TimelineItemEditContainer';
import { TimelineRowType } from '../../enum/TimelineRowType';
import { TIME_FORMAT } from '../../constants';

interface IProps {
    timerange: any;
    visibleTimerange: any;
    appTrackItems: any;
    statusTrackItems: any;
    logTrackItems: any;
    changeVisibleTimerange?: any;
    selectTimelineItem?: any;
    toggleRow?: any;
    tracker?: any;
    selectedTimelineItem?: any;
    chartWidth?: number;
    loading?: boolean;
    isRowEnabled?: any;
}
interface IState {}

interface IHocProps {}

type IFullProps = IProps & IHocProps;

const getTrackItemOrder = (type: string) => {
    if (type === TrackItemType.AppTrackItem) {
        return 1;
    }
    if (type === TrackItemType.StatusTrackItem) {
        return 2;
    }
    if (type === TrackItemType.LogTrackItem) {
        return 3;
    }
    return 0;
};

class TimelineComp extends React.Component<IFullProps, IState> {
    handleTimeRangeChange = (timerange: any) => {
        if (timerange) {
            this.props.changeVisibleTimerange(timerange);
        } else {
            console.error('No Timerange to update');
        }
    };
    handleSelectionChanged = item => {
        if (item) {
            console.log('Selected item:', item);
            this.props.selectTimelineItem(item);
        } else {
            console.error('No item selected');
        }
    };

    handleZoom = domain => {
        this.props.changeVisibleTimerange(domain.x);
    };

    handleBrush = domain => {
        console.log('Selected with brush:', domain.x);

        this.props.changeVisibleTimerange(domain.x);
    };
    calcRowEnabledColor = d => {
        return this.props.isRowEnabled[d] ? blueGrey700 : disabledGrey;
    };
    calcRowEnabledColorFlipped = d => {
        return !this.props.isRowEnabled[d] ? blueGrey700 : disabledGrey;
    };

    onTimelineTypeLabelClick = (item, props) => {
        console.error(item, props);
    };

    render() {
        const {
            appTrackItems,
            logTrackItems,
            statusTrackItems,
            timerange,
            selectedTimelineItem,
            visibleTimerange,
            chartWidth,
            loading,
            isRowEnabled,
            toggleRow,
        }: IFullProps = this.props;

        if (!timerange && !appTrackItems && appTrackItems.length === 0) {
            return <div>No data</div>;
        }
        console.log('Have timerange', visibleTimerange);

        let timelineData = [];
        if (isRowEnabled[TimelineRowType.Status]) {
            // console.log('Adding statusTrackItems:', statusTrackItems);
            timelineData = timelineData.concat(statusTrackItems);
        }
        if (isRowEnabled[TimelineRowType.Log]) {
            // console.log('Adding logTrackItems:', logTrackItems);
            timelineData = timelineData.concat(logTrackItems);
        }
        if (isRowEnabled[TimelineRowType.App]) {
            // console.log('Adding apptrackItems:', appTrackItems);
            timelineData = timelineData.concat(appTrackItems);
        }
        console.log(`Rendering ${timelineData.length} items`);
        const barWidth = 25;

        return (
            <div>
                <MainChart>
                    {loading && (
                        <Spinner>
                            <Spin />
                        </Spinner>
                    )}
                    <Popover
                        style={{ zIndex: 930 }}
                        content={<TimelineItemEditContainer showCloseBtn={true} />}
                        visible={!!selectedTimelineItem}
                        trigger="click"
                    >
                        <VictoryChart
                            theme={chartTheme}
                            height={100}
                            width={chartWidth}
                            domainPadding={{ x: 35, y: 10 }}
                            padding={{ left: 50, top: 0, bottom: 20 }}
                            scale={{ x: 'time' }}
                            domain={{
                                x: [new Date(timerange[0]), new Date(timerange[1])],
                                y: [1, 3],
                            }}
                            containerComponent={
                                <VictoryZoomContainer
                                    responsive={false}
                                    zoomDimension="x"
                                    zoomDomain={{ x: visibleTimerange }}
                                    onZoomDomainChange={debounce(this.handleZoom, 300)}
                                />
                            }
                        >
                            <VictoryAxis
                                dependentAxis={true}
                                tickValues={[1, 2, 3]}
                                tickFormat={['App', 'Status', 'Log']}
                                events={[
                                    {
                                        target: 'tickLabels',
                                        eventHandlers: {
                                            onClick: () => {
                                                return [
                                                    {
                                                        target: 'tickLabels',
                                                        mutation: props => {
                                                            console.log('Toggling row', props);
                                                            toggleRow(props.datum);
                                                            return {
                                                                style: {
                                                                    ...props.style,
                                                                    fill: this.calcRowEnabledColorFlipped(
                                                                        props.datum,
                                                                    ),
                                                                },
                                                            };
                                                        },
                                                    },
                                                ];
                                            },
                                        },
                                    },
                                ]}
                                style={{
                                    grid: { strokeWidth: 0 },
                                    ticks: { stroke: 'grey', size: 5 },
                                    tickLabels: {
                                        fill: this.calcRowEnabledColor,
                                    },
                                }}
                            />
                            <VictoryAxis tickCount={20} />

                            <VictoryBar
                                horizontal={true}
                                events={[
                                    {
                                        target: 'data',
                                        eventHandlers: {
                                            onClick: (e, bubble) => {
                                                this.handleSelectionChanged(bubble.datum);
                                            },
                                        },
                                    },
                                ]}
                                style={{
                                    data: {
                                        width: barWidth,
                                        fill: d => d.color,
                                        stroke: d => d.color,
                                        strokeWidth: 0.5,
                                        fillOpacity: 0.75,
                                    },
                                }}
                                labels={d => {
                                    const diff = moment(new Date(d.endDate)).diff(
                                        moment(new Date(d.beginDate)),
                                    );
                                    const dur = moment.duration(diff);
                                    let formattedDuration = dur.format();
                                    const type =
                                        d.taskName === TrackItemType.StatusTrackItem
                                            ? 'STATUS'
                                            : d.app;
                                    const beginTime = moment(new Date(d.beginDate)).format(
                                        TIME_FORMAT,
                                    );
                                    const endTime = moment(new Date(d.endDate)).format(TIME_FORMAT);

                                    return `${type} - ${
                                        d.title
                                    } [${formattedDuration}] ${beginTime} - ${endTime}`;
                                }}
                                labelComponent={
                                    <VictoryTooltip
                                        horizontal={false}
                                        style={chartTheme.tooltip.style}
                                        cornerRadius={chartTheme.tooltip.cornerRadius}
                                        pointerLength={chartTheme.tooltip.pointerLength}
                                        flyoutStyle={chartTheme.tooltip.flyoutStyle}
                                    />
                                }
                                x={d => getTrackItemOrder(d.taskName)}
                                y={d => new Date(d.beginDate)}
                                y0={d => new Date(d.endDate)}
                                data={timelineData}
                            />
                        </VictoryChart>
                    </Popover>
                </MainChart>
                <BrushChart>
                    <VictoryChart
                        theme={chartTheme}
                        height={50}
                        width={chartWidth}
                        domainPadding={{ x: 35, y: 5 }}
                        padding={{ left: 50, top: 0, bottom: 20 }}
                        scale={{ x: 'time' }}
                        domain={{
                            x: [new Date(timerange[0]), new Date(timerange[1])],
                            y: [1, 3],
                        }}
                        containerComponent={
                            <VictoryBrushContainer
                                responsive={false}
                                brushDimension="x"
                                brushDomain={{ x: visibleTimerange }}
                                onBrushDomainChange={debounce(this.handleBrush, 300)}
                            />
                        }
                    >
                        <VictoryAxis tickCount={20} />

                        <VictoryBar
                            horizontal={true}
                            style={{
                                data: {
                                    width: 7,
                                    fill: d => d.color,
                                    stroke: d => d.color,
                                    strokeWidth: 0.5,
                                    fillOpacity: 0.75,
                                },
                            }}
                            x={d => getTrackItemOrder(d.taskName)}
                            y={d => new Date(d.beginDate)}
                            y0={d => new Date(d.endDate)}
                            data={timelineData}
                        />
                    </VictoryChart>
                </BrushChart>
            </div>
        );
    }
}

export const Timeline = TimelineComp;
