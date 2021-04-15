exports.CbsDiffQuery = `
                    select cbs1.Element 
                    Into #Elements 
                    from t_hist_Weight cbs1 
                    join t_hist_Weight cbs2 on cbs1.Element = cbs2.Element and cbs2.Scale = 49
                    where cbs1.Scale = 48
                    and DATEDIFF(day, cbs1.dtCreated, getdate()) = 1
                    and cbs1.Mode = 3 
                    and cbs2.Mode = cbs1.Mode
                    group by cbs1.Element
                    having (MAX(cbs1.NettoWeight)-MAX(cbs2.NettoWeight)) between -5 and 5  
                        

                    SELECT COUNT(distinct Element) 'count', CAST(dtCreated as date) as 'date'
                    INTO #dailycounts
                    FROM t_hist_Weight
                    where DATEDIFF(DAY, dtCreated, GETDATE()) = 1
                    and Scale in (48,49)
                    group by CAST(dtCreated as date)

                    --INSERT OPENQUERY (GRAFANA, 'SELECT Date, OK, All_Rec, Percent, Diff FROM Cbs_diff')
                    select CAST(cbs1.dtCreated as date) as 'date',
                    COUNT(cbs1.Element) as ok,
                    MAX(ALL_RECORDS.count) AS ALL_REC,
                    CAST(ROUND(((COUNT(cbs1.Element)*100.00)/(MAX(ALL_RECORDS.count))),2) AS decimal(10,2)) AS 'Procent of good REC',
                    CAST(ROUND(avg(cbs1.NettoWeight-cbs2.NettoWeight),2) AS decimal(10,2)) as 'The difference in grams between CBS1 and CBS2'
                    from t_hist_Weight as cbs1
                    join t_hist_Weight as cbs2 on cbs1.Element = cbs2.Element and cbs2.Scale = 49
                    join #dailycounts AS ALL_RECORDS ON CAST(cbs1.dtCreated as date) = ALL_RECORDS.[date]
                    where cbs1.Scale = 48
                    and cbs1.Element in (select Element from #Elements)
                    group by CAST(cbs1.dtCreated as date)

                    DROP TABLE #Elements
                    DROP TABLE #dailycounts
                    --END
                    `;
        
exports.scalesMotionQuery = `
                            --INSERT OPENQUERY (GRAFANA, 'SELECT date, totalDay, percent, mode, Scale FROM Grafana_Motion_Scales')
                            select DATEADD(day, -1, convert(date, GETDATE())) as 'dataTime',
                            COUNT(*) as 'totalDay',
                            cast(count(*) * 100.0 / sum(count(*)) over (PARTITION BY Scale) as Decimal(10,2)) as 'percent', 
                            mode as 'mode', 
                            Scale as 'Scale'
                            from [SIS_History].[dbo].[t_hist_Weight] with (nolock)
                            where Scale in (22, 26, 27, 48, 49)
                            and DATEDIFF(day, dtCreated, getdate()) = 1
                            group by mode, Scale
                            order by Scale, mode`;

exports.tarraQuery = `
                        select top(5) ID, Scale, Tarra, dtCreated
                        from [SIS_History].[dbo].[t_hist_Weight]
                        where dtCreated >= DATEADD(minute, -30, GETDATE())
                        and Mode = 3
                        and Scale in (22, 26, 27, 48, 49)
                        order by ROW_NUMBER() OVER (PARTITION BY Scale ORDER BY ID), Scale
                        `;
exports.matrixCodeLiveQuery = `
                                select	DATEADD(day, -1, convert(date, GETDATE())) as date,
                                [Aantal]
                                FROM [SIS_VIOBOX].[dbo].[v_viobox_ExportAPSData]
                                where Matrix_karkas = 0 
                                `;

exports.matrixCodeHistQuery = `
                            Create Table #MatrixData
                            (      Hist_CountTotalPerPrevDay INT,
                                Hist_NumberOfKarkassWithouMatrixPrevDay INT,
                                Hist_PercentageOfCarcassWithoutMatrixCode INT
                            )

                            INSERT INTO #MatrixData (Hist_CountTotalPerPrevDay, Hist_NumberOfKarkassWithouMatrixPrevDay, Hist_PercentageOfCarcassWithoutMatrixCode)
                            VALUES  (0, 0, 0);
                                

                            Select [ElementID], [Matrix_Karkas], [dtCreated]
                            INTO #TEM1
                            FROM [SIS_History].[dbo].[t_hist_ExportKarkasData]
                            Where dtCreated >= dateadd(day,datediff(day,1,GETDATE()),0)
                                    AND dtCreated < dateadd(day,datediff(day,0,GETDATE()),0)
                                        order by dtCreated desc;



                            UPDATE #MatrixData SET Hist_CountTotalPerPrevDay  =
                            ( Select DISTINCT COUNT(t1.ElementID)
                                from [#TEM1] t1
                                where t1.dtCreated >= dateadd(day,datediff(day,1,GETDATE()),0)
                                    AND t1.dtCreated < dateadd(day,datediff(day,0,GETDATE()),0)
                            );

                            UPDATE #MatrixData SET Hist_NumberOfKarkassWithouMatrixPrevDay =
                            ( Select DISTINCT count (t1.ElementID)
                                from [#TEM1] t1
                                where t1.dtCreated >= dateadd(day,datediff(day,1,GETDATE()),0)
                                    AND t1.dtCreated < dateadd(day,datediff(day,0,GETDATE()),0)
                                        and t1.Matrix_Karkas is null
                            );
                            --CAST(ROUND(((COUNT(cbs1.Element)*100.00)/(MAX(ALL_RECORDS.count))),2) AS decimal(10,2))

                            UPDATE #MatrixData SET Hist_PercentageOfCarcassWithoutMatrixCode =
                            (select (md.Hist_NumberOfKarkassWithouMatrixPrevDay*100.00)/(md.Hist_CountTotalPerPrevDay) --as decimal(10,2))
                                from [#MatrixData] md
                            );

                            select * from #MatrixData;

                            DROP TABLE #TEM1
                            DROP TABLE #MatrixData
                            `;