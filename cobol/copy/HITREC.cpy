      ******************************************************************
      * RULE HIT RECORD - 100 BYTES                                   *
      ******************************************************************
       01  HITREC.
           05  HIT-CLM-ID              PIC X(12).
           05  HIT-RULE-ID             PIC X(4).
           05  HIT-CLASS               PIC X.
               88  HIT-HARD            VALUE 'H'.
               88  HIT-CRITICAL        VALUE 'C'.
               88  HIT-MANUAL          VALUE 'M'.
               88  HIT-WARNING         VALUE 'W'.
           05  HIT-WEIGHT              PIC 9(3).
           05  HIT-CARC                PIC X(3).
           05  HIT-EVIDENCE            PIC X(60).
           05  HIT-RUN-ID              PIC X(14).
           05  FILLER                  PIC X(3).
