-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "annotators" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sample" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "systemInternalId" TEXT,
    "inputInput" TEXT,
    "inputExpectClassfiy" TEXT,
    "inputStep" TEXT,
    "inputObject" TEXT,
    "inputStatus" TEXT,
    "outputActualOutput" TEXT,
    "nodeScriptUncA" TEXT,
    "nodeScriptHbh1" TEXT,
    "nodeScriptTezR" TEXT,
    "nodeScriptORfz" TEXT,
    "nodeZhiShangRAGRerank" TEXT,
    "assignedTo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "Sample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Annotation" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "isClearIntent" TEXT,
    "intentClassificationAccurate" TEXT,
    "hasKnowledge" TEXT,
    "knowledgeTitle" TEXT,
    "recallAccuracy" TEXT,
    "replyQuality" TEXT,
    "unavailableReasons" TEXT NOT NULL,
    "remark" TEXT,
    "actionSuggestionRelevant" TEXT,
    "guessQuestionsOk" TEXT,
    "annotator" TEXT NOT NULL,
    "annotatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Annotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Annotation_sampleId_key" ON "Annotation"("sampleId");

-- CreateIndex
CREATE INDEX "Sample_batchId_idx" ON "Sample"("batchId");

-- CreateIndex
CREATE INDEX "Sample_assignedTo_idx" ON "Sample"("assignedTo");

-- CreateIndex
CREATE INDEX "Sample_status_idx" ON "Sample"("status");

-- CreateIndex
CREATE INDEX "Annotation_batchId_idx" ON "Annotation"("batchId");

-- CreateIndex
CREATE INDEX "Annotation_annotator_idx" ON "Annotation"("annotator");

-- AddForeignKey
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "Sample"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
