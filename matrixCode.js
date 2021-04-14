const mssql = require('mssql');
const mysql = require('mysql');

const configSIS = 
{
    user: 'usr_MPSAdmin',
    password: 'MPS4Vion15',
    server: 'NLBXTMPS02P',
    database: 'SIS_VIOBOX'
}

const configGrafana =
{
    host: '10.52.131.224',
    user: 'artur',
    password: 'viontd',
    database: 'vion_kpi'
}

const sisHistoryPool = mssql.connect(configSIS);
//const grafanaMySQL = mysql.createConnection(configGrafana);
let globalDAtum;

//connection with SIS is handled as promise
sisHistoryPool  
    .then( () => mssql.query(
        `select	DATEADD(day, -1, convert(date, GETDATE())) as date,
        [Aantal]
        FROM [SIS_VIOBOX].[dbo].[v_viobox_ExportAPSData]
        where Matrix_karkas = 0 `
    ))
    .then(result =>{
        const queryDataRow = result.recordset[0];
        const datum = queryDataRow.date.toYMD();
        const aantal = queryDataRow.Aantal
        return [datum, aantal]
    })
    .then(array=>{
        console.log(array)
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
        }
    })
    .then(()=> mssql.close());