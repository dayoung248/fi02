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

            this.getView().setModel(new JSONModel({
                title: "선택 상세 분석",
                Dimension: "",
                Revenue: 0,
                Cost: 0,
                Profit: 0,
                Profitrate: 0,
                ContributionRate: 0,
                Waers: "KRW",
                RevenueCompareText: "",
                RevenueCompareState: "None",
                CostCompareText: "",
                CostCompareState: "None",
                ProfitCompareText: "",
                ProfitCompareState: "None",
                chartTitle: "",
                chartData: [],
                trendTitle: "",
                trendData: []
            }), "selected");

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

            //this.byId("idDetailChartBox").setVisible(this._sAnalysisType !== "A");

            // 6. 최초 KPI 바인딩
            this._bindKpiTile();
            this._setChartSingleSelection();
            this._bindKpiTile();
            // this._bindDetailAnalysis();

            // this._bindCompareChart();

        },
        _toNumber(vValue) {
            var nValue = Number(String(vValue || 0).replace(/,/g, "").trim());

            return isFinite(nValue) ? nValue : 0;
        },
        _hasKpiComparisonValue(vComparisonAmount) {
            return Math.abs(this._toNumber(vComparisonAmount)) >= 0.005;
        },
        _hasKpiRateChange(vRate) {
            return Math.abs(this._toNumber(vRate)) >= 0.005;
        },
        _isKpiComparisonMissing(sStatusId, vComparisonAmount) {
            var oStatus = this.byId(sStatusId);
            var sStatusText = oStatus && oStatus.getText ? oStatus.getText() : "";

            return sStatusText.indexOf("없음") > -1 ||
                sStatusText.indexOf("미발생") > -1 ||
                !this._hasKpiComparisonValue(vComparisonAmount);
        },
        formatKpiIndicator(vComparisonAmount, vRate) {
            if (!this._hasKpiComparisonValue(vComparisonAmount) || !this._hasKpiRateChange(vRate)) {
                return "None";
            }

            return this._toNumber(vRate) > 0 ? "Up" : "Down";
        },
        _applyKpiIndicator(oNumericContent, sIndicator) {
            var bNoIndicator = sIndicator === "None";

            oNumericContent.unbindProperty("indicator");
            oNumericContent.toggleStyleClass("fi02NoKpiIndicator", bNoIndicator);
            oNumericContent.setIndicator(sIndicator);
        },
        _resetKpiIndicators() {
            [
                "idSalesNumeric",
                "idCostNumeric",
                "idProfitNumeric",
                "idProfitRateNumeric"
            ].forEach(function (sId) {
                var oNumericContent = this.byId(sId);

                if (oNumericContent) {
                    this._applyKpiIndicator(oNumericContent, "None");
                }
            }.bind(this));
        },
        _toSalesCompareNumber(oRow, sProperty) {
            return Number((oRow && oRow[sProperty]) || 0);
        },
        _getCurrentAnalysisPeriod(sPeriodType) {
            if (sPeriodType === "M") {
                return {
                    Monat: this._sCurrMonat,
                    Weeks: this._sCurrWeeks
                };
            }

            return {
                Monat: "00",
                Weeks: this._sCurrWeeks
            };
        },
        _getCurrentClosingWeekKey() {
            return String(Math.max(Number(this._sCurrWeeks || 1) - 1, 1)).padStart(2, "0");
        },
        _getCompareResponsePeriod(oGeneral, oRental, sFallbackMonat, sFallbackWeeks) {
            var oPeriodRow = (oGeneral && (oGeneral.Monat || oGeneral.Weeks)) ? oGeneral : oRental || {};
            var sMonat = String(oPeriodRow.Monat || sFallbackMonat || "00").padStart(2, "0");
            var sWeeks = String(oPeriodRow.Weeks || "").padStart(2, "0");

            if (sWeeks === "00") {
                sWeeks = String(sFallbackWeeks || "00").padStart(2, "0");
            }

            return {
                Monat: sMonat,
                Weeks: sWeeks
            };
        },
        _getCurrentCompareLabel(sPeriodType, oGeneral, oRental, sFallbackMonat, sFallbackWeeks) {
            var oPeriod = this._getCompareResponsePeriod(oGeneral, oRental, sFallbackMonat, sFallbackWeeks);
            var sClosingWeeks = this._getCurrentClosingWeekKey();
            var sDisplayWeeks = Number(oPeriod.Weeks || 0) > 0 &&
                Number(oPeriod.Weeks) <= Number(sClosingWeeks) ?
                oPeriod.Weeks :
                sClosingWeeks;

            if (sPeriodType === "M") {
                return "\uB2F9\uAE30 2026\uB144 " + oPeriod.Monat + "\uC6D4 (" +
                    Number(sDisplayWeeks || 0) + "\uC8FC\uCC28 " +
                    this._getWeekEndDateText(2026, sDisplayWeeks) + "\uAE4C\uC9C0)";
            }

            return "\uB2F9\uAE30 2026\uB144 " + sDisplayWeeks + "\uC8FC\uCC28 (" +
                this._getWeekRangeText(2026, sDisplayWeeks) + ")";
        },
        _getWeekEndDateText(iYear, sWeek) {
            return this._formatDate(this._getWeekRange(iYear, sWeek).end);
        },
        _addCompareChartRows(aChartData, sPeriodGroup, sPeriodLabel, sSalesTypeText, oRow, sPrefix) {
            [
                { metric: "\uB9E4\uCD9C", property: sPrefix + "salesamt" },
                { metric: "\uC6D0\uAC00", property: sPrefix + "costamt" },
                { metric: "\uC774\uC775", property: sPrefix + "profitamt" }
            ].forEach(function (oMetric) {
                aChartData.push({
                    Period: sPeriodGroup,
                    PeriodDetail: sPeriodLabel,
                    SalesTypeText: sSalesTypeText,
                    Metric: oMetric.metric,
                    Amount: this._toSalesCompareNumber(oRow, oMetric.property)
                });
            }.bind(this));
        },
        _syncKpiIndicators(oData, iKpiRequestSeq) {
            var aIndicators = [
                {
                    id: "idSalesNumeric",
                    statusId: "idSalesKpiStatus",
                    comparisonAmount: oData.Compsalesamt,
                    rate: oData.Prevsalesrate
                },
                {
                    id: "idCostNumeric",
                    statusId: "idCostKpiStatus",
                    comparisonAmount: oData.Compcostamt,
                    rate: oData.Prevcostrate
                },
                {
                    id: "idProfitNumeric",
                    statusId: "idProfitKpiStatus",
                    comparisonAmount: oData.Compprofitamt,
                    rate: oData.Prevprofitrate
                },
                {
                    id: "idProfitRateNumeric",
                    statusId: "idProfitRateKpiStatus",
                    comparisonAmount: oData.Compsalesamt,
                    rate: oData.Compprofitrate
                }
            ];
            var fnApplyIndicators = function () {
                if (iKpiRequestSeq && iKpiRequestSeq !== this._iKpiRequestSeq) {
                    return;
                }

                aIndicators.forEach(function (oIndicator) {
                    var oNumericContent = this.byId(oIndicator.id);

                    if (oNumericContent) {
                        var sIndicator = this._isKpiComparisonMissing(oIndicator.statusId, oIndicator.comparisonAmount) ?
                            "None" :
                            this.formatKpiIndicator(oIndicator.comparisonAmount, oIndicator.rate);

                        this._applyKpiIndicator(oNumericContent, sIndicator);
                    }
                }.bind(this));
            }.bind(this);

            fnApplyIndicators();
            setTimeout(fnApplyIndicators, 0);
            setTimeout(fnApplyIndicators, 100);
        },
        onTabSelect(oEvent) {
            this._sAnalysisType = oEvent.getParameter("key"); // A / G / R
            if (this._sAnalysisType !== "A") {
                this._sCompareRequestKey = "";
            }
            // this._bindKpiTile(sAnalysisType);
            // 같은 비교기간 기준으로 KPI 다시 조회
            // this._bindKpiTile();

            // this._bindCompareChart();

            // 전체일 때만 보이는 차트
            this.byId("idSalesCompareChart").setVisible(this._sAnalysisType === "A");

            // 일반/렌탈 탭일 때만 고객유형별/제품별 토글 표시
            this.byId("idAnalysisSegment").setVisible(this._sAnalysisType !== "A");

            this.byId("idDetailBox").setVisible(this._sAnalysisType !== "A");

            //this.byId("idDetailChartBox").setVisible(this._sAnalysisType !== "A");

            this.byId("idFCL").setLayout("OneColumn");
            this._setDetailTableCompact(false);

            var oFCL = this.byId("idFCL");

            if (oFCL) {
                oFCL.setLayout("OneColumn");
            }

            this._bindKpiTile();

            if (this._sAnalysisType !== "A") {
                this._bindDetailAnalysis();
            }

            var oDetailModel = this.getView().getModel("detail");
            //oDetailModel.setProperty("/detailData", []); 일단 빼
            //oDetailModel.setProperty("/detailDonutData", []); 일단 빼

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
            this._resetKpiIndicators();

             // 비교기간 선택값
            var sCompMonat = this.byId("idMonat").getSelectedKey();
            var sCompWeeks = this.byId("idWeeks").getSelectedKey();

            var sCurrMonat;
            var sCurrWeeks;
            var sCompMonatForKey;
            var sCompWeeksForKey;
            var oCurrentPeriod = this._getCurrentAnalysisPeriod(sPeriodType);

            if (sPeriodType === "M") {
                // 월 기준 비교
                sCurrMonat = oCurrentPeriod.Monat;
                sCurrWeeks = oCurrentPeriod.Weeks;

                sCompMonatForKey = sCompMonat;
                sCompWeeksForKey = "00";
            } else {
                // 주 기준 비교
                sCurrMonat = oCurrentPeriod.Monat;
                sCurrWeeks = oCurrentPeriod.Weeks;   // 당기 고정

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
            var iKpiRequestSeq = (this._iKpiRequestSeq || 0) + 1;
            this._iKpiRequestSeq = iKpiRequestSeq;
            if (this._sAnalysisType === "A") {
                this._sCompareRequestKey = "";
            }

            this.byId("kpiBox").bindElement({
                path: sPath,
                events: {
                    dataReceived: function () {
                        if (iKpiRequestSeq !== this._iKpiRequestSeq) {
                            return;
                        }

                        var oContext = this.byId("kpiBox").getBindingContext();

                        if (!oContext) {
                            return;
                        }

                        if (this._sAnalysisType !== "A") {
                            this._bindDetailAnalysis();
                        }

                        var oData = oContext.getObject();
                        this._syncKpiIndicators(oData || {}, iKpiRequestSeq);
                        console.log("===== ODATA RESULT =====");
                        console.log(oData);

                        // KPI 모델이 정상적으로 붙은 뒤 차트 조회
                        // this._bindCompareChart();

                    }.bind(this)
                }
            });

            if (this._sAnalysisType === "A") {
                this._bindCompareChart();
            }
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
            _setWeekByMonth(){
            var oWeek = this.byId("idWeeks");
            var sPeriodType = this.byId("idPeriodType").getSelectedKey();
            var iYear = Number(this._sCurrGjahr || 2026);
            var sSelectedWeek = oWeek.getSelectedKey();
            var sMonth = this.byId("idMonat").getSelectedKey();

            oWeek.removeAllItems();

            if (sPeriodType === "W") {
                var iMaxWeek = this._getSelectableMaxWeek(iYear);

                for (var iWeek = 1; iWeek <= iMaxWeek; iWeek++) {
                    var sYearWeek = String(iWeek).padStart(2, "0");

                    oWeek.addItem(
                        new Item({
                            key: sYearWeek,
                            text: sYearWeek + "주차 (" + this._getWeekRangeText(iYear, sYearWeek) + ")"
                        })
                    );
                }

                oWeek.setSelectedKey(
                    this._bSelectPreviousWeekByDefault
                        ? String(iMaxWeek).padStart(2, "0")
                        : this._getSelectableWeekKey(sSelectedWeek, iMaxWeek)
                );
                this._bSelectPreviousWeekByDefault = false;
                return;
            }

            var iMonth = Number(sMonth);
            var iLastDay = new Date(iYear, iMonth, 0).getDate();
            var aWeeks = [];

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
                        text: sWeek + "주차"
                    })
                );
            });

            if (aWeeks.length > 0) {
                oWeek.setSelectedKey(aWeeks[0]);
            }
        },
        _getIsoWeeksInYear(iYear) {
            return Number(this._getWeekNo(new Date(iYear, 11, 28)));
        },
        _getSelectableMaxWeek(iYear) {
            var iMaxWeek = this._getIsoWeeksInYear(iYear);

            if (String(iYear) === this._sCurrGjahr) {
                iMaxWeek = Math.min(iMaxWeek, Number(this._getCurrentClosingWeekKey()) - 1);
            }

            return Math.max(iMaxWeek, 1);
        },
        _getSelectableWeekKey(sSelectedWeek, iMaxWeek) {
            var iSelectedWeek = Number(sSelectedWeek || 0);

            if (iSelectedWeek > 0 && iSelectedWeek <= iMaxWeek) {
                return String(iSelectedWeek).padStart(2, "0");
            }

            return String(iMaxWeek).padStart(2, "0");
        },
        _getWeekRangeText(iYear, sWeek) {
            var oRange = this._getWeekRange(iYear, sWeek);

            return this._formatDate(oRange.start) + " ~ " + this._formatDate(oRange.end);
        },
        _getWeekRange(iYear, sWeek) {
            var iWeek = Number(sWeek || 1);
            var oJan4 = new Date(Date.UTC(iYear, 0, 4));
            var iJan4Day = oJan4.getUTCDay() || 7;
            var oStart = new Date(oJan4);

            oStart.setUTCDate(oJan4.getUTCDate() - iJan4Day + 1 + ((iWeek - 1) * 7));

            var oEnd = new Date(oStart);
            oEnd.setUTCDate(oStart.getUTCDate() + 6);

            return {
                start: oStart,
                end: oEnd
            };
        },
        _formatDate(oDate) {
            return [
                oDate.getUTCFullYear(),
                String(oDate.getUTCMonth() + 1).padStart(2, "0"),
                String(oDate.getUTCDate()).padStart(2, "0")
            ].join(".");
        },
        onPeriodTypeChange(){
            var sKey = this.byId("idPeriodType").getSelectedKey();

            this.byId("idMonat").setVisible(sKey === "M");
            this.byId("idWeeks").setVisible(sKey === "W");

            this._bSelectPreviousWeekByDefault = sKey === "W";
            this._setWeekByMonth();
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
                this.byId("idCompPeriodText").setValue(
                    "비교기간: 2026년 " + sWeeks + "주차 (" + this._getWeekRangeText(2026, sWeeks) + ")"
                );
            }
        },
            _bindCompareChart() {
            var sPeriodType = this.byId("idPeriodType").getSelectedKey();

            var sCompMonat = this.byId("idMonat").getSelectedKey();
            var sCompWeeks = this.byId("idWeeks").getSelectedKey();

            var sCurrMonat, sCurrWeeks, sCompMonatForKey, sCompWeeksForKey;
            var sCurrLabel, sCompLabel;
            var oCurrentPeriod = this._getCurrentAnalysisPeriod(sPeriodType);

            if (sPeriodType === "M") {
                sCurrMonat = oCurrentPeriod.Monat;
                sCurrWeeks = oCurrentPeriod.Weeks;
                sCompMonatForKey = sCompMonat;
                sCompWeeksForKey = "00";

                // 차트 x축 텍스트
                sCurrLabel = "당기 2026년 " + sCurrMonat + "월";
                sCompLabel = "비교 2026년 " + sCompMonat + "월";

            } else {
                sCurrMonat = oCurrentPeriod.Monat;
                sCurrWeeks = oCurrentPeriod.Weeks;   // 당기 고정

                sCompMonatForKey = "00";
                sCompWeeksForKey = sCompWeeks;

                sCurrLabel = "당기 2026년 " + sCurrWeeks + "주차";
                sCompLabel = "비교 2026년 " + sCompWeeks + "주차";
            }

            if (sPeriodType === "W") {
                sCurrLabel = "당기 2026년 " + sCurrWeeks + "주차 (" + this._getWeekRangeText(2026, sCurrWeeks) + ")";
                sCompLabel = "비교 2026년 " + sCompWeeks + "주차 (" + this._getWeekRangeText(2026, sCompWeeks) + ")";
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
            var sCompareRequestKey = [
                this._sAnalysisType,
                sPeriodType,
                sCurrMonat,
                sCurrWeeks,
                sCompMonatForKey,
                sCompWeeksForKey
            ].join("|");
            this._sCompareRequestKey = sCompareRequestKey;

            var oContext = this.byId("kpiBox").getBindingContext();
            var oODataModel = this.getView().getModel() || (oContext && oContext.getModel());
            var oChartModel = this.getView().getModel("chart");

            if (!oODataModel || !oChartModel) {
                return;
            }
            //var oODataModel = this.byId("kpiBox").getModel();
            //var oChartModel = this.getView().getModel("chart");
            oChartModel.setProperty("/salesCompare", []);

            oODataModel.read("/ProfitCompareSet", {
                filters: aFilters,

                success: function (oData) {
                    if (sCompareRequestKey !== this._sCompareRequestKey) {
                        return;
                    }

                    // 일반판매 / 렌탈판매 행 찾기
                    var oGeneral = oData.results.find(function (oRow) {
                        return oRow.Salestype === "G";
                    });

                    var oRental = oData.results.find(function (oRow) {
                        return oRow.Salestype === "R";
                    });
                    oGeneral = oGeneral || {};
                    oRental = oRental || {};
                    sCurrLabel = this._getCurrentCompareLabel(sPeriodType, oGeneral, oRental, sCurrMonat, sCurrWeeks);

                    var aChartData = [];
                    var sGeneralText = "\uC77C\uBC18\uD310\uB9E4";
                    var sRentalText = "\uB80C\uD0C8\uD310\uB9E4";
                    var sCurrGroup = sCurrLabel;
                    var sCompGroup = sCompLabel;

                    if (this._sAnalysisType === "A") {
                        this._addCompareChartRows(aChartData, sCurrGroup, sCurrLabel, sGeneralText, oGeneral, "Curr");
                        this._addCompareChartRows(aChartData, sCurrGroup, sCurrLabel, sRentalText, oRental, "Curr");
                        this._addCompareChartRows(aChartData, sCompGroup, sCompLabel, sGeneralText, oGeneral, "Comp");
                        this._addCompareChartRows(aChartData, sCompGroup, sCompLabel, sRentalText, oRental, "Comp");
                    } else if (this._sAnalysisType === "G") {
                        this._addCompareChartRows(aChartData, sCurrGroup, sCurrLabel, sGeneralText, oGeneral, "Curr");
                        this._addCompareChartRows(aChartData, sCompGroup, sCompLabel, sGeneralText, oGeneral, "Comp");
                    } else if (this._sAnalysisType === "R") {
                        this._addCompareChartRows(aChartData, sCurrGroup, sCurrLabel, sRentalText, oRental, "Curr");
                        this._addCompareChartRows(aChartData, sCompGroup, sCompLabel, sRentalText, oRental, "Comp");
                    }

                    oChartModel.setProperty("/salesCompare", aChartData);

                    // 전체/일반/렌탈 탭 모두 같은 Y축 간격을 쓰기 위해
                    // 표시 데이터가 아니라 전체 판매유형 데이터 기준으로 최대값 계산
                    var aAxisValues = [
                        Number(oGeneral.Currsalesamt || 0),
                        Number(oGeneral.Compsalesamt || 0),
                        Number(oGeneral.Currcostamt || 0),
                        Number(oGeneral.Compcostamt || 0),
                        Number(oGeneral.Currprofitamt || 0),
                        Number(oGeneral.Compprofitamt || 0),
                        Number(oRental.Currsalesamt || 0),
                        Number(oRental.Compsalesamt || 0),
                        Number(oRental.Currcostamt || 0),
                        Number(oRental.Compcostamt || 0),
                        Number(oRental.Currprofitamt || 0),
                        Number(oRental.Compprofitamt || 0)
                    ];
                    var iMaxValue = Math.max.apply(Math, aAxisValues);
                    var iMinValue = Math.min.apply(Math, aAxisValues);

                    // 보기 좋은 단위로 올림
                    var iAxisMax = Math.ceil(iMaxValue / 1000000) * 1000000;

                    // 최소 축 범위 보정
                    if (iAxisMax < 1000000) {
                        iAxisMax = 1000000;
                    }

                    // 여유 한 칸 추가
                    iAxisMax = iAxisMax + 1000000;

                    var iAxisMin = iMinValue < 0 ? Math.floor(iMinValue / 1000000) * 1000000 - 1000000 : 0;

                    this.byId("idSalesCompareChart").setVizProperties({
                        valueAxis: {
                            scale: {
                                fixedRange: true,
                                minValue: iAxisMin,
                                maxValue: iAxisMax
                            }
                        }
                    });
                    this._setChartSingleSelection();
                }.bind(this)
            });
        },
        onAnalysisSegmentChange() {
        //     this.byId("idFCL").setLayout("OneColumn");

        //     var oDetailModel = this.getView().getModel("detail");
        //     oDetailModel.setProperty("/detailData", []);
        //     oDetailModel.setProperty("/detailDonutData", []);

        //     this._bindDetailAnalysis();
            var oFCL = this.byId("idFCL");
            if (oFCL) {
                oFCL.setLayout("OneColumn");
            }
            this._setDetailTableCompact(false);

            var oTable = this.byId("idDetailTable");
            if (oTable) {
                oTable.removeSelections(true);
            }

            this.getView().getModel("selected").setData({
                title: "선택 상세 분석",
                Dimension: "",
                Revenue: 0,
                Cost: 0,
                Profit: 0,
                Profitrate: 0,
                ContributionRate: 0,
                Waers: "KRW",
                RevenueCompareText: "",
                RevenueCompareState: "None",
                CostCompareText: "",
                CostCompareState: "None",
                ProfitCompareText: "",
                ProfitCompareState: "None",
                chartTitle: "",
                chartData: [],
                trendTitle: "",
                trendData: []
            });

            var oDetailModel = this.getView().getModel("detail");
            oDetailModel.setProperty("/detailData", []);
            oDetailModel.setProperty("/detailDonutData", []);

            this._bindDetailAnalysis();
        },
        _bindDetailAnalysis(){
            // 제목 및 칼럼명 변경
            this._setDetailText();

            var sPeriodType = this.byId("idPeriodType").getSelectedKey();
            var sDetailType = this.byId("idAnalysisSegment").getSelectedKey(); // C / M

            var sMonat, sWeeks;
            var oCurrentPeriod = this._getCurrentAnalysisPeriod(sPeriodType);

            if (sPeriodType === "M") {
                sMonat = oCurrentPeriod.Monat;
                sWeeks = oCurrentPeriod.Weeks;
            } else {
                sMonat = oCurrentPeriod.Monat;
                sWeeks = oCurrentPeriod.Weeks;   // 당기 고정
            }

            var aFilters = [
                new sap.ui.model.Filter("Gjahr", sap.ui.model.FilterOperator.EQ, this._sCurrGjahr),
                new sap.ui.model.Filter("Monat", sap.ui.model.FilterOperator.EQ, sMonat),
                new sap.ui.model.Filter("Weeks", sap.ui.model.FilterOperator.EQ, sWeeks),
                new sap.ui.model.Filter("Periodtype", sap.ui.model.FilterOperator.EQ, sPeriodType),
                new sap.ui.model.Filter("Analysistype", sap.ui.model.FilterOperator.EQ, this._sAnalysisType),
                new sap.ui.model.Filter("Detailtype", sap.ui.model.FilterOperator.EQ, sDetailType)
            ];

            // var oContext = this.byId("kpiBox").getBindingContext();

            // if (!oContext) {
            //     return;
            // }

            // var oODataModel = oContext.getModel();
            var oODataModel = this.getView().getModel();
            var oDetailModel = this.getView().getModel("detail");

            //var oODataModel = this.byId("kpiBox").getBindingContext().getModel();
            //var oDetailModel = this.getView().getModel("detail");

            oODataModel.read("/ProfitDetailSet", {
                filters: aFilters,
                // success: function (oData) {
                //     // console.log("DETAIL DATA", oData.results);

                //     // oDetailModel.setProperty("/detailData", oData.results);

                //     var aResult = oData.results || [];
                //     var sDetailType = this.byId("idAnalysisSegment").getSelectedKey(); // C / M

                //     var aChartData = aResult.map(function (oRow) {
                //         if (sDetailType === "C") {
                //             // 고객유형별: 매출 + 이익
                //             return {
                //                 Dimension: oRow.Dimension,
                //                 Revenue: Number(oRow.Revenue || 0),
                //                 Profit: Number(oRow.Profit || 0)
                //             };
                //         } else {
                //             // 제품별: 매출 + 원가
                //             return {
                //                 Dimension: oRow.Dimension,
                //                 Revenue: Number(oRow.Revenue || 0),
                //                 Cost: Number(oRow.Cost || 0)
                //             };
                //         }
                //     });

                //     var aDonutData = aResult
                //         .filter(function (oRow) {
                //             return Number(oRow.Revenue || 0) > 0;
                //         })
                //         .map(function (oRow) {
                //             return {
                //                 Dimension: oRow.Dimension,
                //                 Revenue: Number(oRow.Revenue || 0)
                //             };
                //         });

                //     oDetailModel.setProperty("/detailData", aResult);
                //     //oDetailModel.setProperty("/detailChartData", aChartData);
                //     oDetailModel.setProperty("/detailDonutData", aDonutData);

                //     //this._setDetailChartTitle();
                //     //this._setDetailBarChartMeasure();

                // }.bind(this)

                success: function (oData) {
                    var aResult = oData.results || [];

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

                    oDetailModel.setProperty("/detailData", []);
                    oDetailModel.setProperty("/detailDonutData", []);

                    oDetailModel.setProperty("/detailData", aResult);
                    oDetailModel.setProperty("/detailDonutData", aDonutData);

                    this._setDetailChartTitle();
                    this._syncSelectedDetailAfterRefresh(aResult);

                    var oDonut = this.byId("idDetailDonutChart");
                    if (oDonut) {
                        oDonut.invalidate();
                        oDonut.rerender();
                    }
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

            //this.byId("idDetailBarChart").setVizProperties({
            //    title: {
            //        visible: true,
            //        text: sSalesText + " " + sDetailText + " 수익성 비교"
           //     },
            //    valueAxis: {
            //        title: {
            //            visible: false
            //        }
            //    },
            //    plotArea: {
            //        dataLabel: {
            //            visible: true
            //        }
            //    }
            //});

            this.byId("idDetailDonutChart").setVizProperties({
                title: {
                    visible: true,
                    text: sSalesText + " " + sDetailText + " 매출 점유율"
                },
                legend: {
                    label: {
                        style: {
                            fontSize: "11px"
                        }
                    }
                },
                plotArea: {
                    dataLabel: {
                        visible: true,
                        type: "percentage"
                    }
                }
            });
            this._setChartSingleSelection();
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
        _setCompPeriodText() {
        },
        onPeriodChange() {
            this._setCompPeriodText();
            this._bindKpiTile();
        },
        onDetailRowSelect(oEvent) {
            var oItem = oEvent.getParameter("listItem");
            if (!oItem) {
                return;
            }

            var oRow = oItem.getBindingContext("detail").getObject();
            this._setSelectedDetail(oRow);
        },
        _setSelectedDetail(oRow) {
            var sDetailType = this.byId("idAnalysisSegment").getSelectedKey();

            var aDetailData = this.getView().getModel("detail").getProperty("/detailData") || [];
            var nTotalRevenue = aDetailData.reduce(function (nSum, oData) {
                return nSum + Number(oData.Revenue || 0);
            }, 0);

            var nRevenue = Number(oRow.Revenue || 0);
            var nCost = Number(oRow.Cost || 0);
            var nProfit = Number(oRow.Profit || 0);

            var nContributionRate = 0;
            if (nTotalRevenue !== 0) {
                nContributionRate = nRevenue / nTotalRevenue * 100;
            }

            var aChartData;
            var sChartTitle;

            if (sDetailType === "C") {
                aChartData = [
                    { Metric: "매출", Amount: nRevenue },
                    { Metric: "이익", Amount: nProfit }
                ];
                sChartTitle = oRow.Dimension + " 매출/이익 비교";
            } else {
                aChartData = [
                    { Metric: "매출", Amount: nRevenue },
                    { Metric: "원가", Amount: nCost }
                ];
                sChartTitle = oRow.Dimension + " 매출/원가 비교";
            }

            this.getView().getModel("selected").setData({
                title: oRow.Dimension + " 상세 분석",
                Dimension: oRow.Dimension,
                Revenue: nRevenue,
                Cost: nCost,
                Profit: nProfit,
                Profitrate: Number(oRow.Profitrate || 0),
                ContributionRate: nContributionRate.toFixed(2),
                Waers: oRow.Waers || "KRW",
                RevenueCompareText: "",
                RevenueCompareState: "None",
                CostCompareText: "",
                CostCompareState: "None",
                ProfitCompareText: "",
                ProfitCompareState: "None",
                chartTitle: sChartTitle,
                chartData: aChartData,
                trendTitle: sChartTitle,
                trendData: []
            });

            this.byId("idFCL").setLayout("TwoColumnsMidExpanded");
            this._setDetailTableCompact(true);
            this._bindSelectedComparison(oRow);
            this._bindSelectedTrend(oRow);
        },
        _bindSelectedComparison(oRow) {
            var sPeriodType = this.byId("idPeriodType").getSelectedKey();
            var sDetailType = this.byId("idAnalysisSegment").getSelectedKey();
            var oPeriod = this._getComparisonPeriod(sPeriodType);

            var aFilters = [
                new sap.ui.model.Filter("Gjahr", sap.ui.model.FilterOperator.EQ, this._sCurrGjahr),
                new sap.ui.model.Filter("Monat", sap.ui.model.FilterOperator.EQ, oPeriod.Monat),
                new sap.ui.model.Filter("Weeks", sap.ui.model.FilterOperator.EQ, oPeriod.Weeks),
                new sap.ui.model.Filter("Periodtype", sap.ui.model.FilterOperator.EQ, sPeriodType),
                new sap.ui.model.Filter("Analysistype", sap.ui.model.FilterOperator.EQ, this._sAnalysisType),
                new sap.ui.model.Filter("Detailtype", sap.ui.model.FilterOperator.EQ, sDetailType),
                new sap.ui.model.Filter("Dimension", sap.ui.model.FilterOperator.EQ, oRow.Dimension)
            ];

            var sComparisonKey = [
                this._sAnalysisType,
                sDetailType,
                sPeriodType,
                oPeriod.Monat,
                oPeriod.Weeks,
                oRow.Dimension
            ].join("|");
            this._sSelectedComparisonKey = sComparisonKey;

            this.getView().getModel().read("/ProfitDetailSet", {
                filters: aFilters,
                success: function (oData) {
                    if (sComparisonKey !== this._sSelectedComparisonKey) {
                        return;
                    }

                    var oCompRow = (oData.results || []).find(function (oDataRow) {
                        return oDataRow.Dimension === oRow.Dimension;
                    }) || {};

                    this._applySelectedComparison(oRow, oCompRow);
                }.bind(this)
            });
        },
        _getComparisonPeriod(sPeriodType) {
            if (sPeriodType === "M") {
                return {
                    Monat: this.byId("idMonat").getSelectedKey(),
                    Weeks: "00"
                };
            }

            return {
                Monat: "00",
                Weeks: this.byId("idWeeks").getSelectedKey()
            };
        },
        _applySelectedComparison(oCurrentRow, oCompRow) {
            var oSelectedModel = this.getView().getModel("selected");
            var oRevenue = this._getCompareStatus(Number(oCurrentRow.Revenue || 0), Number(oCompRow.Revenue || 0), false);
            var oCost = this._getCompareStatus(Number(oCurrentRow.Cost || 0), Number(oCompRow.Cost || 0), true);
            var oProfit = this._getCompareStatus(Number(oCurrentRow.Profit || 0), Number(oCompRow.Profit || 0), false);

            oSelectedModel.setProperty("/RevenueCompareText", oRevenue.text);
            oSelectedModel.setProperty("/RevenueCompareState", oRevenue.state);
            oSelectedModel.setProperty("/CostCompareText", oCost.text);
            oSelectedModel.setProperty("/CostCompareState", oCost.state);
            oSelectedModel.setProperty("/ProfitCompareText", oProfit.text);
            oSelectedModel.setProperty("/ProfitCompareState", oProfit.state);
        },
        _getCompareStatus(nCurrent, nComparison, bLowerIsBetter) {
            if (!nComparison) {
                return {
                    text: "비교기간 없음",
                    state: "None"
                };
            }

            var nRate = (nCurrent - nComparison) / Math.abs(nComparison) * 100;
            var sSign = nRate > 0 ? "+" : "";
            var bGood = bLowerIsBetter ? nRate <= 0 : nRate >= 0;

            return {
                text: "대비 " + sSign + nRate.toFixed(1) + "%",
                state: Math.abs(nRate) < 0.05 ? "None" : bGood ? "Success" : "Error"
            };
        },
        _setDetailTableCompact(bCompact) {
            var aMetricColumnIds = [
                "idRevenueColumn",
                "idCostColumn",
                "idProfitColumn",
                "idProfitRateColumn"
            ];
            var oDimensionColumn = this.byId("idDimensionColumn");

            if (oDimensionColumn) {
                oDimensionColumn.setWidth(bCompact ? "100%" : "8rem");
            }

            aMetricColumnIds.forEach(function (sColumnId) {
                var oColumn = this.byId(sColumnId);
                if (oColumn) {
                    oColumn.setVisible(!bCompact);
                }
            }.bind(this));
        },
        _syncSelectedDetailAfterRefresh(aResult) {
            var oFCL = this.byId("idFCL");
            var oSelectedModel = this.getView().getModel("selected");
            var sSelectedDimension = oSelectedModel.getProperty("/Dimension");
            var bKeepSelectedDetail = oFCL && oFCL.getLayout() !== "OneColumn" && !!sSelectedDimension;

            if (!bKeepSelectedDetail) {
                if (oFCL) {
                    oFCL.setLayout("OneColumn");
                }
                this._setDetailTableCompact(false);
                return;
            }

            var oSelectedRow = (aResult || []).find(function (oRow) {
                return oRow.Dimension === sSelectedDimension;
            });

            if (oSelectedRow) {
                this._setSelectedDetail(oSelectedRow);
            } else {
                this.onCloseFlexibleDetail();
                oSelectedModel.setProperty("/trendData", []);
            }
        },
        _bindSelectedTrend(oRow) {
            var sPeriodType = this.byId("idPeriodType").getSelectedKey();
            var sDetailType = this.byId("idAnalysisSegment").getSelectedKey();
            var oPeriod = this._getCurrentPeriodForTrend(sPeriodType);

            var aFilters = [
                new sap.ui.model.Filter("Gjahr", sap.ui.model.FilterOperator.EQ, this._sCurrGjahr),
                new sap.ui.model.Filter("Monat", sap.ui.model.FilterOperator.EQ, oPeriod.Monat),
                new sap.ui.model.Filter("Weeks", sap.ui.model.FilterOperator.EQ, oPeriod.Weeks),
                new sap.ui.model.Filter("Periodtype", sap.ui.model.FilterOperator.EQ, sPeriodType),
                new sap.ui.model.Filter("Analysistype", sap.ui.model.FilterOperator.EQ, this._sAnalysisType),
                new sap.ui.model.Filter("Detailtype", sap.ui.model.FilterOperator.EQ, sDetailType),
                new sap.ui.model.Filter("Dimension", sap.ui.model.FilterOperator.EQ, oRow.Dimension)
            ];

            this._setSelectedTrendChartFeeds();
            this._setSelectedTrendVizProperties(oRow.Dimension, sDetailType, sPeriodType);

            this.getView().getModel().read("/ProfitTrendSet", {
                filters: aFilters,
                success: function (oData) {
                    var aTrendData = this._normalizeTrendData(oData.results || [], sPeriodType);
                    this.getView().getModel("selected").setProperty("/trendData", aTrendData);
                }.bind(this)
            });
        },
        _getCurrentPeriodForTrend(sPeriodType) {
            if (sPeriodType === "M") {
                return {
                    Monat: this._sCurrMonat,
                    Weeks: "00"
                };
            }

            return {
                Monat: "00",
                Weeks: this._sCurrWeeks
            };
        },
        _normalizeTrendData(aRows, sPeriodType) {
            var aTrendData = aRows.map(function (oRow) {
                return {
                    Monat: oRow.Monat,
                    Weeks: oRow.Weeks,
                    Periodlabel: oRow.Periodlabel || this._getTrendPeriodLabel(oRow, sPeriodType),
                    Revenue: Number(oRow.Revenue || 0),
                    Cost: Number(oRow.Cost || 0),
                    Profit: Number(oRow.Profit || 0),
                    Profitrate: Number(oRow.Profitrate || 0)
                };
            }.bind(this));

            aTrendData.sort(function (oA, oB) {
                var nA = sPeriodType === "M" ? Number(oA.Monat || 0) : Number(oA.Weeks || 0);
                var nB = sPeriodType === "M" ? Number(oB.Monat || 0) : Number(oB.Weeks || 0);
                return nA - nB;
            });

            if (sPeriodType === "M") {
                var nCurrMonat = Number(this._sCurrMonat || 0);
                return aTrendData.filter(function (oRow) {
                    var nMonat = Number(oRow.Monat || 0);
                    return nMonat >= 1 && nMonat <= nCurrMonat;
                });
            }

            return aTrendData.slice(-6);
        },
        _getTrendPeriodLabel(oRow, sPeriodType) {
            if (sPeriodType === "M") {
                return Number(oRow.Monat || 0) + "월";
            }

            return Number(oRow.Weeks || 0) + "주";
        },
        _getTrendPeriodLabel(oRow, sPeriodType) {
            if (sPeriodType === "M") {
                return Number(oRow.Monat || 0) + "월";
            }

            var sWeek = String(oRow.Weeks || "0").padStart(2, "0");
            return Number(oRow.Weeks || 0) + "주차 (" + this._getWeekRangeText(2026, sWeek) + ")";
        },
        _getSelectedTrendChartOptions() {
            var aPrimaryMeasures = [];
            var bShowProfitRate = this.byId("idTrendProfitRateCheck").getSelected();

            if (this.byId("idTrendRevenueCheck").getSelected()) {
                aPrimaryMeasures.push("매출");
            }

            if (this.byId("idTrendCostCheck").getSelected()) {
                aPrimaryMeasures.push("원가");
            }

            if (this.byId("idTrendProfitCheck").getSelected()) {
                aPrimaryMeasures.push("이익");
            }

            if (!aPrimaryMeasures.length && !bShowProfitRate) {
                this.byId("idTrendRevenueCheck").setSelected(true);
                aPrimaryMeasures.push("매출");
            }

            return {
                primaryMeasures: aPrimaryMeasures,
                showProfitRate: bShowProfitRate,
                showLabels: this.byId("idTrendLabelSwitch").getState()
            };
        },
        _setSelectedTrendChartFeeds() {
            var oChart = this.byId("idSelectedBarChart");
            var oOptions = this._getSelectedTrendChartOptions();

            if (!oChart) {
                return;
            }

            oChart.setVizType(oOptions.showProfitRate ? "dual_combination" : "combination");
            oChart.removeAllFeeds();

            if (oOptions.primaryMeasures.length) {
                oChart.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                    uid: "valueAxis",
                    type: "Measure",
                    values: oOptions.primaryMeasures
                }));
            }

            if (oOptions.showProfitRate) {
                oChart.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                    uid: "valueAxis2",
                    type: "Measure",
                    values: ["이익률"]
                }));
            }

            oChart.addFeed(new sap.viz.ui5.controls.common.feeds.FeedItem({
                uid: "categoryAxis",
                type: "Dimension",
                values: ["기간"]
            }));
        },
        _setSelectedTrendVizProperties(sDimension, sDetailType, sPeriodType) {
            var sSecondMeasure = sDetailType === "C" ? "이익" : "원가";
            var sPeriodText = sPeriodType === "M" ? "1월 ~ " + Number(this._sCurrMonat || 0) + "월" : "주차별 수익성 변화 추이";
            // var sTitle = sDimension + " " + sPeriodText + " 매출/" + sSecondMeasure + "/이익률 추이";

            var sTitle = sDimension + " " + "주차별 수익성 변화 추이";
            this.getView().getModel("selected").setProperty("/trendTitle", sTitle);
            var oOptions = this._getSelectedTrendChartOptions();

            this.byId("idSelectedBarChart").setVizProperties({
                title: {
                    visible: true,
                    text: sTitle
                },
                valueAxis: {
                    title: {
                        visible: true,
                        text: "금액(원)"
                    }
                },
                valueAxis2: {
                    title: {
                        visible: true,
                        text: "이익률(%)"
                    }
                },
                plotArea: {
                    dataLabel: {
                        visible: oOptions.showLabels
                    },
                    dataShape: {
                        primaryAxis: oOptions.primaryMeasures.map(function () {
                            return "bar";
                        }),
                        secondaryAxis: oOptions.showProfitRate ? ["line"] : []
                    }
                }
            });
            this._setChartSingleSelection();
        },
        _setSelectedTrendVizProperties(sDimension, sDetailType, sPeriodType) {
            var sSecondMeasure = sDetailType === "C" ? "이익" : "원가";
            var sPeriodText = sPeriodType === "M" ? "1월 ~ " + Number(this._sCurrMonat || 0) + "월" : "최근 6주";
            // var sTitle = sDimension + " " + sPeriodText + " 매출/" + sSecondMeasure + "/이익률 추이";
            var sTitle = sDimension + " " + "주차별 수익성 변화 추이";
            var oOptions = this._getSelectedTrendChartOptions();
            var oVizProperties = {
                title: {
                    visible: true,
                    text: sTitle
                },
                valueAxis: {
                    title: {
                        visible: true,
                        text: "금액(원)"
                    }
                },
                plotArea: {
                    dataLabel: {
                        visible: oOptions.showLabels
                    },
                    dataShape: {
                        primaryAxis: oOptions.primaryMeasures.map(function () {
                            return "bar";
                        })
                    }
                }
            };

            if (oOptions.showProfitRate) {
                oVizProperties.valueAxis2 = {
                    title: {
                        visible: true,
                        text: "이익률(%)"
                    }
                };
                oVizProperties.plotArea.dataShape.secondaryAxis = ["line"];
            }

            this.getView().getModel("selected").setProperty("/trendTitle", sTitle);
            this.byId("idSelectedBarChart").setVizProperties(oVizProperties);
            this._setChartSingleSelection();
        },
        _setChartSingleSelection() {
            [
                "idSalesCompareChart",
                "idDetailDonutChart",
                "idSelectedBarChart"
            ].forEach(function (sChartId) {
                var oChart = this.byId(sChartId);

                if (oChart) {
                    oChart.setVizProperties({
                        interaction: {
                            selectability: {
                                mode: "SINGLE"
                            }
                        }
                    });
                }
            }.bind(this));
        },
        onSelectedTrendOptionChange() {
            var oSelectedModel = this.getView().getModel("selected");
            var sDimension = oSelectedModel.getProperty("/Dimension");

            this._setSelectedTrendChartFeeds();
            this._setSelectedTrendVizProperties(
                sDimension,
                this.byId("idAnalysisSegment").getSelectedKey(),
                this.byId("idPeriodType").getSelectedKey()
            );
        },
        onCloseFlexibleDetail() {
            this.byId("idFCL").setLayout("OneColumn");
            this._setDetailTableCompact(false);

            var oTable = this.byId("idDetailTable");
            if (oTable) {
                oTable.removeSelections(true);
            }
        }
    });
});
