      ******************************************************************
      * CLAIM INPUT RECORD - 120 BYTES                                *
      ******************************************************************
       01  CLMREC.
           05  CLM-REC-TYPE            PIC X.
               88  CLM-DETAIL          VALUE 'D'.
               88  CLM-TRAILER         VALUE 'T'.
           05  CLM-ID                  PIC X(12).
           05  CLM-POLICY-NO           PIC X(10).
           05  CLM-MEMBER-ID           PIC X(12).
           05  CLM-PROVIDER-ID         PIC X(10).
           05  CLM-DOS-FROM            PIC 9(8).
           05  CLM-DOS-TO              PIC 9(8).
           05  CLM-SUBMIT-DATE         PIC 9(8).
           05  CLM-POS-CODE            PIC X(2).
           05  CLM-DX-PRIMARY          PIC X(7).
           05  CLM-DX-SECONDARY        PIC X(7).
           05  CLM-PROC-CODE           PIC X(5).
           05  CLM-PROC-MOD            PIC X(2).
           05  CLM-UNITS               PIC 9(3).
           05  CLM-BILLED-AMT          PIC 9(7)V99.
           05  CLM-AUTH-NO             PIC X(10).
           05  FILLER                  PIC X(6).
