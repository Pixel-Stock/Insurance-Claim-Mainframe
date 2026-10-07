      ******************************************************************
      * CLAIM WORK AREA - SHARED BY MAIN AND SUBPROGRAMS              *
      ******************************************************************
       01  CLAIM-WORK.
      *
      * CURRENT CLAIM BEING PROCESSED
      *
           05  CW-CLAIM                PIC X(120).
           05  CW-CLAIM-REC REDEFINES CW-CLAIM.
               COPY CLMREC.
      *
      * MATCHED MASTER RECORDS
      *
           05  CW-POLICY.
               10  CW-POL-FOUND        PIC X VALUE 'N'.
                   88  CW-POL-OK       VALUE 'Y'.
                   88  CW-POL-NOTFOUND VALUE 'N'.
               10  CW-POL-REC          PIC X(60).
               10  CW-POL-DATA REDEFINES CW-POL-REC.
                   COPY POLREC.
      *
           05  CW-MEMBER.
               10  CW-MEM-FOUND        PIC X VALUE 'N'.
                   88  CW-MEM-OK       VALUE 'Y'.
                   88  CW-MEM-NOTFOUND VALUE 'N'.
               10  CW-MEM-REC          PIC X(60).
               10  CW-MEM-DATA REDEFINES CW-MEM-REC.
                   COPY MEMREC.
      *
           05  CW-PROVIDER.
               10  CW-PRV-FOUND        PIC X VALUE 'N'.
                   88  CW-PRV-OK       VALUE 'Y'.
                   88  CW-PRV-NOTFOUND VALUE 'N'.
               10  CW-PRV-REC          PIC X(60).
               10  CW-PRV-DATA REDEFINES CW-PRV-REC.
                   COPY PRVREC.
      *
      * HISTORY WINDOW FOR CURRENT MEMBER
      *
           05  CW-HISTORY.
               10  CW-HST-COUNT        PIC 9(2) VALUE ZERO.
               10  CW-HST-ENTRY OCCURS 99 TIMES
                                INDEXED BY CW-HST-IDX.
                   15  CW-HST-REC      PIC X(80).
                   15  CW-HST-DATA REDEFINES CW-HST-REC.
                       COPY HSTREC.
      *
      * RUN PARAMETERS
      *
           05  CW-PARAMS.
               10  CW-RUN-ID           PIC X(14).
               10  CW-RUN-DATE         PIC 9(8).
               10  CW-RUN-DATE-DAY     PIC 9(7) VALUE ZERO.
               10  CW-FILE-LIM-DAYS    PIC 9(3) VALUE 90.
               10  CW-HV-THRESHOLD     PIC 9(9) VALUE 50000000.
               10  CW-FREQ-WINDOW      PIC 9(3) VALUE 30.
               10  CW-UPDATE-ON        PIC X VALUE 'N'.
                   88  CW-UPDATE-YES   VALUE 'Y'.
                   88  CW-UPDATE-NO    VALUE 'N'.
      *
      * SCORING AND DISPOSITION
      *
           05  CW-SCORING.
               10  CW-SCORE            PIC 9(4) VALUE ZERO.
               10  CW-SCORE-UNCAPPED   PIC 9(4) VALUE ZERO.
               10  CW-FLOOR-SEV        PIC 9 VALUE 1.
               10  CW-FINAL-SEV        PIC 9 VALUE 1.
               10  CW-DISP             PIC X VALUE SPACE.
                   88  CW-PASSED       VALUE 'P'.
                   88  CW-MANUAL       VALUE 'M'.
                   88  CW-CRITICAL     VALUE 'C'.
                   88  CW-REJECTED     VALUE 'X'.
      *
      * HIT TABLE - UP TO 32 HITS PER CLAIM
      *
           05  CW-HITS.
               10  CW-HIT-COUNT        PIC 9(2) VALUE ZERO.
               10  CW-HIT-ENTRY OCCURS 32 TIMES
                                INDEXED BY CW-HIT-IDX.
                   15  CW-HIT-RULE     PIC X(4).
                   15  CW-HIT-CLASS    PIC X.
                   15  CW-HIT-WEIGHT   PIC 9(3).
                   15  CW-HIT-CARC     PIC X(3).
                   15  CW-HIT-EVIDENCE PIC X(60).
      *
      * SKIP FLAGS - DEPENDENCY MAP
      *
           05  CW-SKIP-FLAGS.
               10  CW-SKIP-ELIG        PIC X VALUE 'N'.
                   88  CW-DO-ELIG      VALUE 'N'.
                   88  CW-NO-ELIG      VALUE 'Y'.
               10  CW-SKIP-BENF        PIC X VALUE 'N'.
                   88  CW-DO-BENF      VALUE 'N'.
                   88  CW-NO-BENF      VALUE 'Y'.
               10  CW-SKIP-CLIN        PIC X VALUE 'N'.
                   88  CW-DO-CLIN      VALUE 'N'.
                   88  CW-NO-CLIN      VALUE 'Y'.
               10  CW-SKIP-DUPE        PIC X VALUE 'N'.
                   88  CW-DO-DUPE      VALUE 'N'.
                   88  CW-NO-DUPE      VALUE 'Y'.
      *
      * DATE CONVERSION WORK AREAS
      *
           05  CW-DATE-WORK.
               10  CW-DATE-INPUT       PIC 9(8).
               10  CW-DATE-VALID       PIC X VALUE 'N'.
                   88  CW-DATE-OK      VALUE 'Y'.
                   88  CW-DATE-BAD     VALUE 'N'.
               10  CW-DATE-DAY-NUM     PIC 9(7).
               10  CW-AGE-YEARS        PIC 9(3).
      *
      * TEMPORARY CALCULATION FIELDS
      *
           05  CW-TEMP.
               10  CW-TEMP-AMT         PIC S9(9)V99 COMP-3.
               10  CW-TEMP-NUM         PIC S9(9) COMP-3.
               10  CW-TEMP-COUNT       PIC 9(3).
               10  CW-TEMP-IDX         PIC 9(3).
               10  CW-TEMP-CHAR        PIC X.
               10  CW-TEMP-STRING      PIC X(100).
