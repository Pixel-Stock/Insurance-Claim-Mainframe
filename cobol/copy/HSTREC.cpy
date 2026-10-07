      ******************************************************************
      * CLAIM HISTORY RECORD - 80 BYTES                               *
      * KEY: MEMBER-ID + DOS-FROM + PROC-CODE + PROVIDER-ID (35 BYTES)*
      ******************************************************************
       01  HSTREC.
           05  HST-MEMBER-ID           PIC X(12).
           05  HST-DOS-FROM            PIC 9(8).
           05  HST-PROC-CODE           PIC X(5).
           05  HST-PROVIDER-ID         PIC X(10).
           05  HST-CLM-ID              PIC X(12).
           05  HST-BILLED-AMT          PIC 9(7)V99.
           05  HST-DISP                PIC X.
               88  HST-PASSED          VALUE 'P'.
               88  HST-MANUAL          VALUE 'M'.
               88  HST-CRITICAL        VALUE 'C'.
               88  HST-REJECTED        VALUE 'X'.
           05  HST-RUN-DATE            PIC 9(8).
           05  FILLER                  PIC X(15).
