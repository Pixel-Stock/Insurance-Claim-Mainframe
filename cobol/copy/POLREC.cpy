      ******************************************************************
      * POLICY MASTER RECORD - 60 BYTES                               *
      ******************************************************************
       01  POLREC.
           05  POL-POLICY-NO           PIC X(10).
           05  POL-PLAN-CODE           PIC X(4).
           05  POL-STATUS              PIC X.
               88  POL-ACTIVE          VALUE 'A'.
               88  POL-LAPSED          VALUE 'L'.
               88  POL-SUSPENDED       VALUE 'S'.
               88  POL-CANCELLED       VALUE 'C'.
           05  POL-EFF-DATE            PIC 9(8).
           05  POL-TERM-DATE           PIC 9(8).
           05  POL-WAIT-DAYS           PIC 9(3).
           05  POL-SUM-INSURED         PIC S9(9)V99 COMP-3.
           05  POL-UTILISED-AMT        PIC S9(9)V99 COMP-3.
           05  FILLER                  PIC X(14).
