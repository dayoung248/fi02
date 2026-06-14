sap.ui.define([
    "sap/ui/core/mvc/Controller"
], (Controller) => {
    "use strict";

    return Controller.extend("code.t4.ui5.fi02.controller.Main", {
        onInit() {
            this._bindKpiTile("A");
        },
        onTabSelect(oEvent) {
            var sAnalysisType = oEvent.getParameter("key"); // A / G / R
            this._bindKpiTile(sAnalysisType);
        },
        _bindKpiTile: function (sAnalysisType) {
            var sPath = "/ProfitKpiSet(" +
                "Gjahr='2026'," +
                "Monat='06'," +
                "Weeks='00'," +
                "Compgjahr='2026'," +
                "Compmonat='05'," +
                "Compweeks='00'," +
                "Periodtype='M'," +
                "Analysistype='" + sAnalysisType + "'" +
            ")";

            this.byId("kpiBox").bindElement({
                path: sPath
            });
        }
    });
});