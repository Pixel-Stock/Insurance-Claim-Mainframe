      ******************************************************************
      * EXCEPTION OUTPUT RECORD - 100 BYTES                           *
      ******************************************************************
       01  EXCREC.
           05  EXC-CLM-ID              PIC X(12).
           05  EXC-MEMBER-ID           PIC X(12).
           05  EXC-POLICY-NO           PIC X(10).
           05  EXC-PROVIDER-ID         PIC X(10).
           05  EXC-DOS-FROM            PIC 9(8).
           05  EXC-BILLED-AMT          PIC 9(7)V99.
           05  EXC-SCORE               PIC 9(3).
           05  EXC-DISP                PIC X.
               88  EXC-MANUAL          VALUE 'M'.
               88  EXC-CRITICAL        VALUE 'C'.
               88  EXC-REJECTED        VALUE 'X'.
           05  EXC-SEV                 PIC 9.
           05  EXC-HIT-COUNT           PIC 9(2).
           05  EXC-TOP-RULE            PIC X(4).
           05  EXC-RUN-ID              PIC X(14).
           05  FILLER                  PIC X(14).
