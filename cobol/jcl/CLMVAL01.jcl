//CLMVAL01 JOB (ACCT),'CLAIMS VALIDATION',CLASS=A,MSGCLASS=X,
//             NOTIFY=&SYSUID,REGION=0M
//         SET HLQ=USER01.CLMVAL
//*---------------------------------------------------------------
//* STEP 005: BACKUP MASTERS                                     *
//*---------------------------------------------------------------
//BACKUP   EXEC PGM=IDCAMS
//SYSPRINT DD SYSOUT=*
//POLIN    DD DISP=SHR,DSN=&HLQ..POLICY.KSDS
//POLOUT   DD DSN=&HLQ..POLICY.BKUP(+1),DISP=(NEW,CATLG,DELETE),
//            SPACE=(TRK,(5,5)),DCB=(RECFM=FB,LRECL=60)
//HSTIN    DD DISP=SHR,DSN=&HLQ..HISTORY.KSDS
//HSTOUT   DD DSN=&HLQ..HISTORY.BKUP(+1),DISP=(NEW,CATLG,DELETE),
//            SPACE=(TRK,(10,10)),DCB=(RECFM=FB,LRECL=80)
//SYSIN    DD *
  REPRO INFILE(POLIN) OUTFILE(POLOUT)
  REPRO INFILE(HSTIN) OUTFILE(HSTOUT)
/*
//*---------------------------------------------------------------
//* STEP 010: CLEAN OLD OUTPUTS                                  *
//*---------------------------------------------------------------
//CLEAN    EXEC PGM=IEFBR14
//D1       DD DSN=&HLQ..PASSED,DISP=(MOD,DELETE,DELETE),SPACE=(TRK,1)
//D2       DD DSN=&HLQ..EXCEPT,DISP=(MOD,DELETE,DELETE),SPACE=(TRK,1)
//D3       DD DSN=&HLQ..EXCEPT.SORTED,
//            DISP=(MOD,DELETE,DELETE),SPACE=(TRK,1)
//D4       DD DSN=&HLQ..HITS,DISP=(MOD,DELETE,DELETE),SPACE=(TRK,1)
//D5       DD DSN=&HLQ..CTLTOT,DISP=(MOD,DELETE,DELETE),SPACE=(TRK,1)
//D6       DD DSN=&HLQ..SUMRPT,DISP=(MOD,DELETE,DELETE),SPACE=(TRK,1)
//*---------------------------------------------------------------
//* STEP 020: VALIDATE CLAIMS                                    *
//*---------------------------------------------------------------
//VALIDATE EXEC PGM=CLMVAL
//STEPLIB  DD DISP=SHR,DSN=&HLQ..LOADLIB
//SYSOUT   DD SYSOUT=*
//CLMIN    DD DISP=SHR,DSN=&HLQ..CLAIMS.INPUT
//POLMST   DD DISP=SHR,DSN=&HLQ..POLICY.KSDS
//MEMMST   DD DISP=SHR,DSN=&HLQ..MEMBER.KSDS
//PRVMST   DD DISP=SHR,DSN=&HLQ..PROVIDER.KSDS
//HISTORY  DD DISP=SHR,DSN=&HLQ..HISTORY.KSDS
//PROCREF  DD DISP=SHR,DSN=&HLQ..REF.PROC
//DXREF    DD DISP=SHR,DSN=&HLQ..REF.DX
//PAIRREF  DD DISP=SHR,DSN=&HLQ..REF.PAIRS
//PLANEXC  DD DISP=SHR,DSN=&HLQ..REF.PLANEXC
//CLMPASS  DD DSN=&HLQ..PASSED,DISP=(NEW,CATLG,DELETE),
//            SPACE=(CYL,(5,5),RLSE),
//            DCB=(RECFM=FB,LRECL=120,BLKSIZE=0)
//CLMEXC   DD DSN=&HLQ..EXCEPT,DISP=(NEW,CATLG,DELETE),
//            SPACE=(CYL,(2,2),RLSE),
//            DCB=(RECFM=FB,LRECL=100,BLKSIZE=0)
//CLMHIT   DD DSN=&HLQ..HITS,DISP=(NEW,CATLG,DELETE),
//            SPACE=(CYL,(5,5),RLSE),
//            DCB=(RECFM=FB,LRECL=100,BLKSIZE=0)
//CTLTOT   DD DSN=&HLQ..CTLTOT,DISP=(NEW,CATLG,DELETE),
//            SPACE=(TRK,(1,1),RLSE),
//            DCB=(RECFM=FB,LRECL=80,BLKSIZE=0)
//SYSIN    DD *
RUNID=CV20261007-01
RUNDATE=20261007
FILELIM=090
HVTHR=0500000.00
FREQWIN=030
UPDATE=Y
/*
//*---------------------------------------------------------------
//* CONDITIONAL STEPS - RUN IF VALIDATE RC < 12                  *
//*---------------------------------------------------------------
//CHK1     IF (VALIDATE.RC LT 12) THEN
//*---------------------------------------------------------------
//* STEP 030: SORT EXCEPTIONS BY SEVERITY AND AMOUNT             *
//*---------------------------------------------------------------
//SORTEXC  EXEC PGM=SORT
//SYSOUT   DD SYSOUT=*
//SORTIN   DD DISP=SHR,DSN=&HLQ..EXCEPT
//SORTOUT  DD DSN=&HLQ..EXCEPT.SORTED,DISP=(NEW,CATLG,DELETE),
//            SPACE=(CYL,(2,2),RLSE),
//            DCB=(RECFM=FB,LRECL=100,BLKSIZE=0)
//SYSIN    DD *
  SORT FIELDS=(66,1,ZD,D,53,9,ZD,D)
/*
//*---------------------------------------------------------------
//* STEP 040: GENERATE REPORTS                                   *
//*---------------------------------------------------------------
//REPORT   EXEC PGM=CLMRPT
//STEPLIB  DD DISP=SHR,DSN=&HLQ..LOADLIB
//SYSOUT   DD SYSOUT=*
//CTLTOT   DD DISP=SHR,DSN=&HLQ..CTLTOT
//CLMEXC   DD DISP=SHR,DSN=&HLQ..EXCEPT.SORTED
//CLMHIT   DD DISP=SHR,DSN=&HLQ..HITS
//RPTOUT   DD DSN=&HLQ..SUMRPT,DISP=(NEW,CATLG,DELETE),
//            SPACE=(CYL,(1,1),RLSE),
//            DCB=(RECFM=FBA,LRECL=133,BLKSIZE=0)
//         ENDIF
//*---------------------------------------------------------------
//* CONDITIONAL STEPS - RUN IF REPORT RC < 8                     *
//*---------------------------------------------------------------
//CHK2     IF (REPORT.RC LT 8) THEN
//*---------------------------------------------------------------
//* STEP 045: PRINT REPORT TO SYSOUT                             *
//*---------------------------------------------------------------
//PRINT    EXEC PGM=IEBGENER
//SYSPRINT DD SYSOUT=*
//SYSIN    DD DUMMY
//SYSUT1   DD DISP=SHR,DSN=&HLQ..SUMRPT
//SYSUT2   DD SYSOUT=*
//*---------------------------------------------------------------
//* STEP 050: ARCHIVE REPORT                                     *
//*---------------------------------------------------------------
//ARCHIVE  EXEC PGM=IEBGENER
//SYSPRINT DD SYSOUT=*
//SYSIN    DD DUMMY
//SYSUT1   DD DISP=SHR,DSN=&HLQ..SUMRPT
//SYSUT2   DD DSN=&HLQ..SUMRPT.ARCH(+1),DISP=(NEW,CATLG,DELETE),
//            SPACE=(CYL,(1,1),RLSE),
//            DCB=(RECFM=FBA,LRECL=133,BLKSIZE=0)
//         ENDIF
