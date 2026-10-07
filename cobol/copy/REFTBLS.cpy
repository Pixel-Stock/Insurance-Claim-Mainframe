      ******************************************************************
      * REFERENCE TABLES LOADED INTO MEMORY                           *
      ******************************************************************
      *
      * PROCEDURE REFERENCE TABLE
      *
       01  PROC-TABLE.
           05  PROC-COUNT              PIC 9(3) VALUE ZERO.
           05  PROC-ENTRY OCCURS 100 TIMES
                           ASCENDING KEY PROC-CODE
                           INDEXED BY PROC-IDX.
               10  PROC-CODE           PIC X(5).
               10  PROC-ALLOWED        PIC 9(9).
               10  PROC-MAX-UNITS      PIC 9(3).
               10  PROC-AUTH-REQ       PIC X.
                   88  PROC-AUTH-YES   VALUE 'Y'.
                   88  PROC-AUTH-NO    VALUE 'N'.
               10  PROC-AGE-MIN        PIC 9(3).
               10  PROC-AGE-MAX        PIC 9(3).
               10  PROC-GENDER         PIC X.
                   88  PROC-BOTH       VALUE 'B'.
                   88  PROC-MALE-ONLY  VALUE 'M'.
                   88  PROC-FEM-ONLY   VALUE 'F'.
               10  PROC-POS-LIST       PIC X(20).
               10  PROC-DX-LIST        PIC X(50).
      *
      * DIAGNOSIS REFERENCE TABLE
      *
       01  DX-TABLE.
           05  DX-COUNT                PIC 9(3) VALUE ZERO.
           05  DX-ENTRY OCCURS 100 TIMES
                        ASCENDING KEY DX-CODE
                        INDEXED BY DX-IDX.
               10  DX-CODE             PIC X(7).
               10  DX-GENDER           PIC X.
                   88  DX-BOTH         VALUE 'B'.
                   88  DX-MALE-ONLY    VALUE 'M'.
                   88  DX-FEM-ONLY     VALUE 'F'.
               10  DX-AGE-MIN          PIC 9(3).
               10  DX-AGE-MAX          PIC 9(3).
      *
      * NON-BILLABLE PAIR TABLE
      *
       01  PAIR-TABLE.
           05  PAIR-COUNT              PIC 9(3) VALUE ZERO.
           05  PAIR-ENTRY OCCURS 50 TIMES
                          ASCENDING KEY PAIR-KEY
                          INDEXED BY PAIR-IDX.
               10  PAIR-KEY            PIC X(10).
               10  PAIR-PROC1          PIC X(5).
               10  PAIR-PROC2          PIC X(5).
      *
      * PLAN EXCLUSION TABLE
      *
       01  PLANEXC-TABLE.
           05  PLANEXC-COUNT           PIC 9(3) VALUE ZERO.
           05  PLANEXC-ENTRY OCCURS 50 TIMES
                             ASCENDING KEY PLANEXC-KEY
                             INDEXED BY PLANEXC-IDX.
               10  PLANEXC-KEY         PIC X(9).
               10  PLANEXC-PLAN        PIC X(4).
               10  PLANEXC-PROC        PIC X(5).
