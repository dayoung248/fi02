sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Item",
    "sap/ui/model/json/JSONModel"
], (Controller, Item, JSONModel) => {
    "use strict";

    return Controller.extend("code.t4.ui5.fi02.controller.Main", {
        onInit() {

            // 현재 선택된 탭
            // this._bindKpiTile("A");

            // 현재 선택된 탭: A 전체 / G 일반 / R 렌탈
            this._sAnalysisType = "A";

            // 현재기간은 화면에서 조회할 당기 기준
            // 나중에 오늘 날짜 기준으로 바꿔도 됨

            var oToday = new Date();

            this._sCurrGjahr = String(oToday.getFullYear());
            this._sCurrMonat = String(oToday.getMonth() + 1).padStart(2, "0");
            this._sCurrWeeks = this._getWeekNo(oToday);
            //this._sCurrGjahr = "2026";
            //this._sCurrMonat = "06";
            //this._sCurrWeeks = "23";

            var oMonat = this.byId("idMonat");

            for (var i = 1; i <= 12; i++) {

                var sMonat = String(i).padStart(2, "0");

                oMonat.addItem(
                    new Item({
                        key: sMonat,
                        text: sMonat + "월"
                    })
                );
            }

            oMonat.setSelectedKey("05");

            // this._setWeekByMonth(); // 최초 실행 시, setWeekByMonth 함수를 실행한다.
                                    // 선택되어 있는 월에 해당하는 주차만 select 되도록 한다.

             // 3. 월 기준이면 주차 숨김
            this.onPeriodTypeChange();

            // 4. 선택 월 기준 주차 생성
            this._setWeekByMonth();

            // 5. 비교기간 텍스트 세팅
            this._setCompPeriodText();

            this.getView().setModel(new JSONModel({
                salesCompare: []
            }), "chart");

            this.getView().setModel(new JSONModel({
                detailData: [],
                detailChartData: [],
                detailDonutData: []
            }), "detail");

            // 전체일 때만 보이는 차트
            this.byId("idSalesCompareChart").setVisible(this._sAnalysisType === "A");

            // 일반/렌탈 탭일 때만 고객유형별/제품별 토글 표시
            this.byId("idAnalysisSegment").setVisible(this._sAnalysisType !== "A");

            this.byId("idDetailBox").setVisible(this._sAnalysisType !== "A");

            // if (this._sAnalysisType === "A") {
            //    this._bindCompareChart();
            //    this.getView().getModel("detail").setProperty("/detailData", []);
            //} else {
            //    this._bindDetailAnalysis();
            //}

            this.byId("idDetailChartBox").setVisible(this._sAnalysisType !== "A");

            // 6. 최초 KPI 바인딩
            this._bindKpiTile();
            // this._bindDetailAnalysis();

            // this._bindCompareChart();

        },
        onTabSelect(oEvent) {
            this._sAnalysisType = oEvent.getParameter("key"); // A / G / R
            // this._bindKpiTile(sAnalysisType);
            // 같은 비교기간 기준으로 KPI 다시 조회
            // this._bindKpiTile();

            // this._bindCompareChart();

            // 전체일 때만 보이는 차트
            this.byId("idSalesCompareChart").setVisible(this._sAnalysisType === "A");

            // 일반/렌탈 탭일 때만 고객유형별/제품별 토글 표시
            this.byId("idAnalysisSegment").setVisible(this._sAnalysisType !== "A");

            this.byId("idDetailBox").setVisible(this._sAnalysisType !== "A");

            this.byId("idDetailChartBox").setVisible(this._sAnalysisType !== "A");
            // 같은 비교기간 기준으로 KPI 다시 조회
            this._bindKpiTile();

            //if (this._sAnalysisType === "A") {
            //    this.getView().getModel("detail").setProperty("/detailData", []);
            //    this.getView().getModel("detail").setProperty("/detailChartData", []);
            //    this.getView().getModel("detail").setProperty("/detailDonutData", []);

            //    this._bindCompareChart();
            //} else {
            //    this._bindDetailAnalysis();
            //}
            // this._bindDetailAnalysis();

        },
        _bindKpiTile() {

            var sPeriodType = this.byId("idPeriodType").getSelectedKey();

             // 비교기간 선택값
            var sCompMonat = this.byId("idMonat").getSelectedKey();
            var sCompWeeks = this.byId("idWeeks").getSelectedKey();

            var sCurrMonat;
            var sCurrWeeks;
            var sCompMonatForKey;
            var sCompWeeksForKey;

            if (sPeriodType === "M") {
                // 월 기준 비교
                sCurrMonat = this._sCurrMonat;
                sCurrWeeks = "00";

                sCompMonatForKey = sCompMonat;
                sCompWeeksForKey = "00";
            } else {
                // 주 기준 비교
                sCurrMonat = "00";
                sCurrWeeks = this._sCurrWeeks;   // 당기 고정

                sCompMonatForKey = "00";
                sCompWeeksForKey = sCompWeeks;   // 비교기간만 Select
            }

            var sPath = "/ProfitKpiSet(" +
                "Gjahr='" + this._sCurrGjahr + "'," +
                "Monat='" + sCurrMonat + "'," +
                "Weeks='" + sCurrWeeks + "'," +
                "Compgjahr='2026'," +
                "Compmonat='" + sCompMonatForKey + "'," +
                "Compweeks='" + sCompWeeksForKey + "'," +
                "Periodtype='" + sPeriodType + "'," +
                "Analysistype='" + this._sAnalysisType + "'" +
            ")";
            this.byId("kpiBox").bindElement({
                path: sPath,
                events: {
                    dataReceived: function () {
                        var oContext = this.byId("kpiBox").getBindingContext();

                        if (!oContext) {
                            return;
                        }

                        if (this._sAnalysisType === "A") {
                            this._bindCompareChart();
                        } else {
                            this._bindDetailAnalysis();
                        }

                        var oData = oContext.getObject();
                        console.log("===== ODATA RESULT =====");
                        console.log(oData);

                        // KPI 모델이 정상적으로 붙은 뒤 차트 조회
                        // this._bindCompareChart();

                    }.bind(this)
                }
            });
        },
        onMonatChange(){
            // 선택된 월이 바뀔 때, 주차 데이터를 다시 세팅한다.
            this._setWeekByMonth();
            this._setCompPeriodText();
            this._bindKpiTile();
        },
        _setWeekByMonth(){
            var oWeek = this.byId("idWeeks");
            // var sYear = this.byId("idGjahr").getSelectedKey();
            var sMonth = this.byId("idMonat").getSelectedKey();

            oWeek.removeAllItems();

            var iYear = 2026;
            var iMonth = Number(sMonth);

            var iLastDay = new Date(iYear, iMonth, 0).getDate();
            var aWeeks = [];

            // 선택한 월에 포함된 주차만 선택지로
            for (var iDay = 1; iDay <= iLastDay; iDay++) {
                var oDate = new Date(iYear, iMonth - 1, iDay);
                var sWeek = this._getWeekNo(oDate);

                if (!aWeeks.includes(sWeek)) {
                    aWeeks.push(sWeek);
                }
            }

            aWeeks.forEach(function (sWeek) {
                oWeek.addItem(
                    new Item({
                        key: sWeek,
                        text: sWeek + "주"
                    })
                );
            });

            if (aWeeks.length > 0) {
                oWeek.setSelectedKey(aWeeks[0]);
            }
        },
        _getWeekNo(oDate){
            var d = new Date(Date.UTC(oDate.getFullYear(), oDate.getMonth(), oDate.getDate()));
            var dayNum = d.getUTCDay() || 7;

            d.setUTCDate(d.getUTCDate() + 4 - dayNum);

            var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);

            return String(weekNo).padStart(2, "0");
        },
        onPeriodTypeChange(){
            var sKey = this.byId("idPeriodType").getSelectedKey();

            // 월 기준인 경우에는 주차 선택 Select 가 보이지 않도록
            // if(sKey === "M"){
            //    this.byId("idWeeks").setVisible(false);
            //}
            //else{
            //    this.byId("idWeeks").setVisible(true);
            //}

            this.byId("idWeeks").setVisible(sKey === "W");

            this._setCompPeriodText();

            if (this.getView().getModel("chart")) {
                this._bindKpiTile();
            }
        },
        _setCompPeriodText(){
                var sPeriodType = this.byId("idPeriodType").getSelectedKey();
                var sMonat = this.byId("idMonat").getSelectedKey();
                var sWeeks = this.byId("idWeeks").getSelectedKey();

                if (sPeriodType === "M") {
                    this.byId("idCompPeriodText").setValue("비교기간: 2026년 " + sMonat + "월");
                } else {
                    this.byId("idCompPeriodText").setValue("비교기간: 2026년 " + sWeeks + "주차");
                }
            },
            _bindCompareChart() {
            var sPeriodType = this.byId("idPeriodType").getSelectedKey();

            var sCompMonat = this.byId("idMonat").getSelectedKey();
            var sCompWeeks = this.byId("idWeeks").getSelectedKey();

            var sCurrMonat, sCurrWeeks, sCompMonatForKey, sCompWeeksForKey;
            var sCurrLabel, sCompLabel;

            if (sPeriodType === "M") {
                sCurrMonat = this._sCurrMonat;
                sCurrWeeks = "00";
                sCompMonatForKey = sCompMonat;
                sCompWeeksForKey = "00";

                // 차트 x축 텍스트
                sCurrLabel = "당기 2026년 " + sCurrMonat + "월";
                sCompLabel = "비교 2026년 " + sCompMonat + "월";

            } else {
                sCurrMonat = "00";
                sCurrWeeks = this._sCurrWeeks;   // 당기 고정

                sCompMonatForKey = "00";
                sCompWeeksForKey = sCompWeeks;

                sCurrLabel = "당기 2026년 " + sCurrWeeks + "주차";
                sCompLabel = "비교 2026년 " + sCompWeeks + "주차";
            }

            var aFilters = [
                new sap.ui.model.Filter("Gjahr", sap.ui.model.FilterOperator.EQ, this._sCurrGjahr),
                new sap.ui.model.Filter("Monat", sap.ui.model.FilterOperator.EQ, sCurrMonat),
                new sap.ui.model.Filter("Weeks", sap.ui.model.FilterOperator.EQ, sCurrWeeks),
                new sap.ui.model.Filter("Compgjahr", sap.ui.model.FilterOperator.EQ, "2026"),
                new sap.ui.model.Filter("Compmonat", sap.ui.model.FilterOperator.EQ, sCompMonatForKey),
                new sap.ui.model.Filter("Compweeks", sap.ui.model.FilterOperator.EQ, sCompWeeksForKey),
                new sap.ui.model.Filter("Periodtype", sap.ui.model.FilterOperator.EQ, sPeriodType)
            ];

            var oContext = this.byId("kpiBox").getBindingContext();

            if (!oContext) {
                return;
            }

            var oODataModel = oContext.getModel();
            var oChartModel = this.getView().getModel("chart");
            //var oODataModel = this.byId("kpiBox").getModel();
            //var oChartModel = this.getView().getModel("chart");

            oODataModel.read("/ProfitCompareSet", {
                filters: aFilters,

                success: function (oData) {

                    // 일반판매 / 렌탈판매 행 찾기
                    var oGeneral = oData.results.find(function (oRow) {
                        return oRow.Salestype === "G";
                    });

                    var oRental = oData.results.find(function (oRow) {
                        return oRow.Salestype === "R";
                    });

                    var aChartData = [];

                    if (this._sAnalysisType === "A") {
                        aChartData.push(
                            {
                                Period: sCurrLabel,
                                SalesTypeText: "일반판매",
                                Sales: Number(oGeneral.Currsalesamt)
                            },
                            {
                                Period: sCurrLabel,
                                SalesTypeText: "렌탈판매",
                                Sales: Number(oRental.Currsalesamt)
                            },
                            {
                                Period: sCompLabel,
                                SalesTypeText: "일반판매",
                                Sales: Number(oGeneral.Compsalesamt)
                            },
                            {
                                Period: sCompLabel,
                                SalesTypeText: "렌탈판매",
                                Sales: Number(oRental.Compsalesamt)
                            }
                        );
                    } else if (this._sAnalysisType === "G") {
                        aChartData.push(
                            {
                                Period: sCurrLabel,
                                SalesTypeText: "일반판매",
                                Sales: Number(oGeneral.Currsalesamt)
                            },
                            {
                                Period: sCompLabel,
                                SalesTypeText: "일반판매",
                                Sales: Number(oGeneral.Compsalesamt)
                            }
                        );
                    } else if (this._sAnalysisType === "R") {
                        aChartData.push(
                            {
                                Period: sCurrLabel,
                                SalesTypeText: "렌탈판매",
                                Sales: Number(oRental.Currsalesamt)
                            },
                            {
                                Period: sCompLabel,
                                SalesTypeText: "렌탈판매",
                                Sales: Number(oRental.Compsalesamt)
                            }
                        );
                    }

                    oChartModel.setProperty("/salesCompare", aChartData);

                    // 전체/일반/렌탈 탭 모두 같은 Y축 간격을 쓰기 위해
                    // 표시 데이터가 아니라 전체 판매유형 데이터 기준으로 최대값 계산
                    var iMaxValue = Math.max(
                        Number(oGeneral.Currsalesamt || 0),
                        Number(oGeneral.Compsalesamt || 0),
                        Number(oRental.Currsalesamt || 0),
                        Number(oRental.Compsalesamt || 0)
                    );

                    // 보기 좋은 단위로 올림
                    var iAxisMax = Math.ceil(iMaxValue / 1000000) * 1000000;

                    // 최소 축 범위 보정
                    if (iAxisMax < 1000000) {
                        iAxisMax = 1000000;
                    }

                    // 여유 한 칸 추가
                    iAxisMax = iAxisMax + 1000000;

                    this.byId("idSalesCompareChart").setVizProperties({
                        valueAxis: {
                            scale: {
                                fixedRange: true,
                                minValue: 0,
                                maxValue: iAxisMax
                            }
                        }
                    });
                }.bind(this)
            });
        },
        onAnalysisSegmentChange() {
            this._bindDetailAnalysis();
        },
        _bindDetailAnalysis(){
            // 제목 및 칼럼명 변경
            this._setDetailText();

            var sPeriodType = this.byId("idPeriodType").getSelectedKey();
            var sDetailType = this.byId("idAnalysisSegment").getSelectedKey(); // C / M

            var sMonat, sWeeks;

            if (sPeriodType === "M") {
                sMonat = this._sCurrMonat;
                sWeeks = "00";
            } else {
                sMonat = "00";
                sWeeks = this._sCurrWeeks;   // 당기 고정
            }

            var aFilters = [
                new sap.ui.model.Filter("Gjahr", sap.ui.model.FilterOperator.EQ, this._sCurrGjahr),
                new sap.ui.model.Filter("Monat", sap.ui.model.FilterOperator.EQ, sMonat),
                new sap.ui.model.Filter("Weeks", sap.ui.model.FilterOperator.EQ, sWeeks),
                new sap.ui.model.Filter("Periodtype", sap.ui.model.FilterOperator.EQ, sPeriodType),
                new sap.ui.model.Filter("Analysistype", sap.ui.model.FilterOperator.EQ, this._sAnalysisType),
                new sap.ui.model.Filter("Detailtype", sap.ui.model.FilterOperator.EQ, sDetailType)
            ];

            var oContext = this.byId("kpiBox").getBindingContext();

            if (!oContext) {
                return;
            }

            var oODataModel = oContext.getModel();
            var oDetailModel = this.getView().getModel("detail");

            //var oODataModel = this.byId("kpiBox").getBindingContext().getModel();
            //var oDetailModel = this.getView().getModel("detail");

            oODataModel.read("/ProfitDetailSet", {
                filters: aFilters,
                success: function (oData) {
                    // console.log("DETAIL DATA", oData.results);

                    // oDetailModel.setProperty("/detailData", oData.results);

                    var aResult = oData.results || [];
                    var sDetailType = this.byId("idAnalysisSegment").getSelectedKey(); // C / M

                    var aChartData = aResult.map(function (oRow) {
                        if (sDetailType === "C") {
                            // 고객유형별: 매출 + 이익
                            return {
                                Dimension: oRow.Dimension,
                                Revenue: Number(oRow.Revenue || 0),
                                Profit: Number(oRow.Profit || 0)
                            };
                        } else {
                            // 제품별: 매출 + 원가
                            return {
                                Dimension: oRow.Dimension,
                                Revenue: Number(oRow.Revenue || 0),
                                Cost: Number(oRow.Cost || 0)
                            };
                        }
                    });

                    var aDonutData = aResult
                        .filter(function (oRow) {
                            return Number(oRow.Revenue || 0) > 0;
                        })
                        .map(function (oRow) {
                            return {
                                Dimension: oRow.Dimension,
                                Revenue: Number(oRow.Revenue || 0)
                            };
                        });

                    oDetailModel.setProperty("/detailData", aResult);
                    oDetailModel.setProperty("/detailChartData", aChartData);
                    oDetailModel.setProperty("/detailDonutData", aDonutData);

                    this._setDetailChartTitle();
                    this._setDetailBarChartMeasure();

                }.bind(this)
            });
        },
        _setDetailText() {
            var sSalesText = this._sAnalysisType === "G" ? "일반판매" : "렌탈판매";
            var sDetailType = this.byId("idAnalysisSegment").getSelectedKey();
            var sDetailText = sDetailType === "C" ? "고객유형별" : "제품별";

            this.byId("idDetailTitle").setText(sSalesText + " " + sDetailText + " 수익성 분석");
            this.byId("idDimensionColumnText").setText(sDetailType === "C" ? "고객유형" : "제품코드");
        },
        _setDetailChartTitle() {
            var sSalesText = this._sAnalysisType === "G" ? "일반판매" : "렌탈판매";

            var sDetailType = this.byId("idAnalysisSegment").getSelectedKey();
            var sDetailText = sDetailType === "C" ? "고객유형별" : "제품별";

            this.byId("idDetailBarChart").setVizProperties({
                title: {
                    visible: true,
                    text: sSalesText + " " + sDetailText + " 수익성 비교"
                },
                valueAxis: {
                    title: {
                        visible: false
                    }
                },
                plotArea: {
                    dataLabel: {
                        visible: true
                    }
                }
            });

            this.byId("idDetailDonutChart").setVizProperties({
                title: {
                    visible: true,
                    text: sSalesText + " " + sDetailText + " 매출 점유율"
                },
                plotArea: {
                    dataLabel: {
                        visible: true,
                        type: "percentage"
                    }
                }
            });
        },
        _setDetailBarChartMeasure(){
            var sDetailType = this.byId("idAnalysisSegment").getSelectedKey();

            var oChart = this.byId("idDetailBarChart");

            if (sDetailType === "C") {
                // 고객유형별: 매출 + 이익
                oChart.removeAllFeeds();

                oChart.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                    uid: "valueAxis",
                    type: "Measure",
                    values: ["매출", "이익"]
                }));

                oChart.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                    uid: "categoryAxis",
                    type: "Dimension",
                    values: ["분석대상"]
                }));
            } else {
                // 제품별: 매출 + 원가
                oChart.removeAllFeeds();

                oChart.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                    uid: "valueAxis",
                    type: "Measure",
                    values: ["매출", "원가"]
                }));

                oChart.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                    uid: "categoryAxis",
                    type: "Dimension",
                    values: ["분석대상"]
                }));
            }
        },
        onPeriodChange() {
            this._setCompPeriodText();
            this._bindKpiTile();
        }
    });
});