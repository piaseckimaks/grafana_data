const mssql = require('mssql');
const mysql = require('mysql');
const config = require('./config');
const log4js = require('log4js');

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
const configSIS = config.configSISLive;
const configGrafana = config.configGrafana;


const sisHistoryPool = mssql.connect(configSIS);
//const grafanaMySQL = mysql.createConnection(configGrafana);
let globalDAtum;

//connection with SIS is handled as promise
sisHistoryPool  
    .then( 
        () => mssql.query(
            `select	DATEADD(day, -1, convert(date, GETDATE())) as date,
            [Aantal]
            FROM [SIS_VIOBOX].[dbo].[v_viobox_ExportAPSData]
            where Matrix_karkas = 0 `
        ),
        //if connection fail then this function is called and log error into file /logs/matrix_code/[logsDate]_matrixCode.log
        e => logger.error(e)
    )
    .then(result =>{
        logger.info('Query in SIS_Live executate succesfully');

        const queryDataRow = result.recordset[0];
        const datum = queryDataRow.date.toYMD();
        const aantal = queryDataRow.Aantal
        //I changed array to the object so is more readeable later in the code
        return { datum: datum, aatnal: aantal}
        },
        e => logger.error(e)
    )
    .then(data=>{
        logger.info('Data from SIS_Live available!');

        const date = new Date();

        console.log(data.datum + 'data z query');
        console.log(date.toYMD() + 'data z node');
        
        if(data.datum == date.toYMD()) console.log('Equal')
        else console.log('Not equal')
        
        
        /*console.log(array)
        let a = new Date().toLocaleDateString() 
        let b = array[0]
        function convert(stringdate) {
            stringdateB = stringdate.replace(/-/g, "/");
            return b =stringdateB;
        }
        convert(b)
       // b.replace(/-/g,"/")
        console.log(`${a} this is a`)
        console.log(`${b} this is b`)
        if (b == a) {
            console.log(` is true`) 
        } else {
            console.log(` is false`)
        }*/
        },
        e => logger.error(e)
    )
    .then(()=> mssql.close());