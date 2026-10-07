      ******************************************************************
      * MEMBER MASTER RECORD - 60 BYTES                               *
      ******************************************************************
       01  MEMREC.
           05  MEM-MEMBER-ID           PIC X(12).
           05  MEM-POLICY-NO           PIC X(10).
           05  MEM-DOB                 PIC 9(8).
           05  MEM-GENDER              PIC X.
               88  MEM-MALE            VALUE 'M'.
               88  MEM-FEMALE          VALUE 'F'.
           05  MEM-RELATION            PIC X(2).
               88  MEM-SELF            VALUE 'SE'.
               88  MEM-SPOUSE          VALUE 'SP'.
               88  MEM-CHILD           VALUE 'CH'.
               88  MEM-PARENT          VALUE 'PA'.
           05  MEM-STATUS              PIC X.
               88  MEM-ACTIVE          VALUE 'A'.
               88  MEM-INACTIVE        VALUE 'I'.
           05  FILLER                  PIC X(26).
