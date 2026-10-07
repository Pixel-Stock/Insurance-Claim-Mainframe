//CLMSETUP JOB (ACCT),'SETUP VSAM',CLASS=A,MSGCLASS=X,
//             NOTIFY=&SYSUID,REGION=0M
//         SET HLQ=USER01.CLMVAL
//*---------------------------------------------------------------
//* DEFINE VSAM CLUSTERS                                         *
//*---------------------------------------------------------------
//DEFINE   EXEC PGM=IDCAMS
//SYSPRINT DD SYSOUT=*
//SYSIN    DD *
  DELETE &HLQ..POLICY.KSDS CLUSTER PURGE
  DELETE &HLQ..MEMBER.KSDS CLUSTER PURGE
  DELETE &HLQ..PROVIDER.KSDS CLUSTER PURGE
  DELETE &HLQ..HISTORY.KSDS CLUSTER PURGE
  
  DEFINE CLUSTER (NAME(&HLQ..POLICY.KSDS) -
         INDEXED -
         KEYS(10 0) -
         RECORDSIZE(60 60) -
         TRACKS(5 5) -
         SHAREOPTIONS(2 3)) -
    DATA (NAME(&HLQ..POLICY.KSDS.DATA)) -
    INDEX (NAME(&HLQ..POLICY.KSDS.INDEX))
    
  DEFINE CLUSTER (NAME(&HLQ..MEMBER.KSDS) -
         INDEXED -
         KEYS(12 0) -
         RECORDSIZE(60 60) -
         TRACKS(10 5) -
         SHAREOPTIONS(2 3)) -
    DATA (NAME(&HLQ..MEMBER.KSDS.DATA)) -
    INDEX (NAME(&HLQ..MEMBER.KSDS.INDEX))
    
  DEFINE CLUSTER (NAME(&HLQ..PROVIDER.KSDS) -
         INDEXED -
         KEYS(10 0) -
         RECORDSIZE(60 60) -
         TRACKS(2 2) -
         SHAREOPTIONS(2 3)) -
    DATA (NAME(&HLQ..PROVIDER.KSDS.DATA)) -
    INDEX (NAME(&HLQ..PROVIDER.KSDS.INDEX))
    
  DEFINE CLUSTER (NAME(&HLQ..HISTORY.KSDS) -
         INDEXED -
         KEYS(35 0) -
         RECORDSIZE(80 80) -
         TRACKS(20 10) -
         SHAREOPTIONS(2 3)) -
    DATA (NAME(&HLQ..HISTORY.KSDS.DATA)) -
    INDEX (NAME(&HLQ..HISTORY.KSDS.INDEX))
    
  DEFINE GDG (NAME(&HLQ..POLICY.BKUP) -
         LIMIT(7) -
         SCRATCH)
         
  DEFINE GDG (NAME(&HLQ..HISTORY.BKUP) -
         LIMIT(7) -
         SCRATCH)
         
  DEFINE GDG (NAME(&HLQ..SUMRPT.ARCH) -
         LIMIT(30) -
         SCRATCH)
/*
//*---------------------------------------------------------------
//* LOAD MASTERS FROM SEED FILES                                 *
//*---------------------------------------------------------------
//LOAD     EXEC PGM=CLMLOAD
//STEPLIB  DD DISP=SHR,DSN=&HLQ..LOADLIB
//SYSOUT   DD SYSOUT=*
//POLIN    DD DISP=SHR,DSN=&HLQ..SEED.POLICY
//POLOUT   DD DISP=SHR,DSN=&HLQ..POLICY.KSDS
//MEMIN    DD DISP=SHR,DSN=&HLQ..SEED.MEMBER
//MEMOUT   DD DISP=SHR,DSN=&HLQ..MEMBER.KSDS
//PRVIN    DD DISP=SHR,DSN=&HLQ..SEED.PROVIDER
//PRVOUT   DD DISP=SHR,DSN=&HLQ..PROVIDER.KSDS
