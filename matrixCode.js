const mssql = require('mssql');
const mysql = require('mysql');
const config = require('./config');
const log4js = require('log4js');
const querys = require('./querys');

const logsDate = new Date();
const logsConfig =
{
    appenders: { fileAppender: {type: 'file', filename: `./logs/matrix_code/${logsDate.toYMD()}_matrixCode.log`}},
    categories: { default: { appenders: ['fileAppender'], level: 'info' }}
}
//configure loging package
log4js.configure(logsConfig);
//setting up a logger
const logger = log4js.getLogger();

//getting config from main config module
const configLiveSIS = config.configSISLive;
const configHistSIS = config.configSISHistory;
const configGrafana = config.configGrafana;


//const grafanaMySQL = mysql.createConnection(configGrafana);


(async function()
    {
        try
        {
            //querying data from Live
            await mssql.connect(configLiveSIS);
            const dataLive = await mssql.query(querys.matrixCodeLiveQuery);
            if(typeof dataLive === 'object' && dataLive != null) logger.info('Query in SIS_Live executed succesfully!');
            mssql.close();

            //querying data from History
            await mssql.connect(configHistSIS);
            const dataHist = await mssql.query(querys.matrixCodeHistQuery);
            if(typeof dataHist === 'object' && dataHist != null) logger.info('Query in SIS_History executed succesfully!');
            mssql.close();

            const numberWithoutMatrixLive = dataLive.recordset[0].Aantal;
            const countTotaalHist = dataHist.recordset[0].Hist_CountTotalPerPrevDay;
            const numberWithoutMatrixHist = dataHist.recordset[0].Hist_NumberOfKarkassWithouMatrixPrevDay;
            const percentageOfCarcasWithoutMatrix = dataHist.recordset[0].Hist_PercentageOfCarcassWithoutMatrixCode;
            const date = dataLive.recordset[0].date.toYMD();

            //logs if data is valid
            if(
                numberWithoutMatrixLive != 'undefined' && 
                countTotaalHist != 'undefined' && 
                numberWithoutMatrixHist != 'undefined' && 
                percentageOfCarcasWithoutMatrix != 'undefined' && 
                date != 'undefined') logger.info('Data succesfully get from MSSQL!');

            console.log(numberWithoutMatrixLive +' | '+ countTotaalHist +' | '+ numberWithoutMatrixHist + ' | ' + percentageOfCarcasWithoutMatrix + ' | ' + date);
            

        }
        catch(err)
        {
            logger.error(err);
        }
        
    }
)()