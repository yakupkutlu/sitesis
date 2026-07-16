--
-- PostgreSQL database dump
--

\restrict 1GD81PImVXtKafff2X1qEiltN5km7uOvtQWdzAiU7yQFYFzu9afilFeOOyldJPO

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: AccountingExpenseCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AccountingExpenseCategory" AS ENUM (
    'ELEVATOR',
    'MAINTENANCE',
    'REPAIR',
    'CLEANING',
    'PERSONNEL',
    'UTILITIES',
    'INSURANCE',
    'TAX',
    'SECURITY',
    'LANDSCAPING',
    'OTHER'
);


--
-- Name: AccountingExpenseStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AccountingExpenseStatus" AS ENUM (
    'ACTIVE',
    'CANCELLED'
);


--
-- Name: AiProvider; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AiProvider" AS ENUM (
    'OPENAI',
    'GEMINI',
    'CUSTOM'
);


--
-- Name: AnnouncementStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AnnouncementStatus" AS ENUM (
    'ACTIVE',
    'ARCHIVED'
);


--
-- Name: AnnouncementTargetType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AnnouncementTargetType" AS ENUM (
    'ALL',
    'SITE',
    'BLOCK',
    'APARTMENT'
);


--
-- Name: ApartmentResidentType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ApartmentResidentType" AS ENUM (
    'OWNER',
    'TENANT'
);


--
-- Name: ContactMessageStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ContactMessageStatus" AS ENUM (
    'NEW',
    'READ',
    'ARCHIVED'
);


--
-- Name: EmailProvider; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EmailProvider" AS ENUM (
    'SMTP',
    'SENDGRID'
);


--
-- Name: IntegrationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."IntegrationStatus" AS ENUM (
    'ACTIVE',
    'PASSIVE'
);


--
-- Name: ManagerScopeType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ManagerScopeType" AS ENUM (
    'SITE',
    'BLOCK'
);


--
-- Name: NotificationChannel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationChannel" AS ENUM (
    'SMS',
    'EMAIL'
);


--
-- Name: NotificationSourceType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationSourceType" AS ENUM (
    'MANUAL',
    'PAYMENT_BATCH',
    'ANNOUNCEMENT',
    'RESIDENT_REQUEST',
    'SYSTEM'
);


--
-- Name: NotificationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationStatus" AS ENUM (
    'PENDING',
    'SENT',
    'FAILED',
    'SKIPPED'
);


--
-- Name: PaymentAllocationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentAllocationStatus" AS ENUM (
    'PENDING',
    'PAID',
    'CANCELLED'
);


--
-- Name: PaymentScopeType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentScopeType" AS ENUM (
    'SITE',
    'BLOCK',
    'APARTMENTS'
);


--
-- Name: ReceiptStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReceiptStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: RequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RequestStatus" AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'DONE',
    'REJECTED'
);


--
-- Name: RequestType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RequestType" AS ENUM (
    'MAINTENANCE',
    'COMPLAINT',
    'SUGGESTION',
    'GENERAL'
);


--
-- Name: SmsProvider; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SmsProvider" AS ENUM (
    'ILETIMERKEZI',
    'NETGSM',
    'TWILIO'
);


--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserRole" AS ENUM (
    'SUPER_ADMIN',
    'MANAGER',
    'RESIDENT'
);


--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
    'PASSIVE'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AccountingExpense; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AccountingExpense" (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    category public."AccountingExpenseCategory" NOT NULL,
    "amountKurus" integer NOT NULL,
    "expenseDate" timestamp(3) without time zone NOT NULL,
    "vendorName" text,
    "invoiceNumber" text,
    status public."AccountingExpenseStatus" DEFAULT 'ACTIVE'::public."AccountingExpenseStatus" NOT NULL,
    "siteId" text NOT NULL,
    "blockId" text,
    "paymentBatchId" text,
    "createdByUserId" text NOT NULL,
    "cancelledByUserId" text,
    "cancellationReason" text,
    "cancelledAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: AccountingExpenseDocument; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AccountingExpenseDocument" (
    id text NOT NULL,
    "originalFileName" text NOT NULL,
    "storedFileName" text NOT NULL,
    "mimeType" text NOT NULL,
    "sizeBytes" integer NOT NULL,
    "expenseId" text NOT NULL,
    "uploadedByUserId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AiSetting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AiSetting" (
    id text NOT NULL,
    provider public."AiProvider" NOT NULL,
    status public."IntegrationStatus" DEFAULT 'PASSIVE'::public."IntegrationStatus" NOT NULL,
    name text,
    "modelName" text,
    "baseUrl" text,
    "apiKeyEncrypted" text,
    "createdByUserId" text,
    "updatedByUserId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    "consecutiveFailureCount" integer DEFAULT 0 NOT NULL,
    "cooldownUntil" timestamp(3) without time zone,
    "lastFailureAt" timestamp(3) without time zone,
    "lastFailureCode" text,
    "lastFailureMessage" text,
    "lastSuccessAt" timestamp(3) without time zone,
    priority integer DEFAULT 100 NOT NULL
);


--
-- Name: Announcement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Announcement" (
    id text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    "targetType" public."AnnouncementTargetType" NOT NULL,
    status public."AnnouncementStatus" DEFAULT 'ACTIVE'::public."AnnouncementStatus" NOT NULL,
    "siteId" text,
    "blockId" text,
    "apartmentId" text,
    "createdByUserId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: AnnouncementRead; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AnnouncementRead" (
    id text NOT NULL,
    "announcementId" text NOT NULL,
    "userId" text NOT NULL,
    "readAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Apartment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Apartment" (
    id text NOT NULL,
    number text NOT NULL,
    floor integer,
    description text,
    "blockId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ApartmentResident; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ApartmentResident" (
    id text NOT NULL,
    type public."ApartmentResidentType" NOT NULL,
    "apartmentId" text NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "userId" text,
    action text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text,
    "ipAddress" text,
    "userAgent" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Block; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Block" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "siteId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "imageUrl" text
);


--
-- Name: ContactMessage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ContactMessage" (
    id text NOT NULL,
    "fullName" text NOT NULL,
    email text NOT NULL,
    phone text,
    message text NOT NULL,
    status public."ContactMessageStatus" DEFAULT 'NEW'::public."ContactMessageStatus" NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: EmailSetting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmailSetting" (
    id text NOT NULL,
    provider public."EmailProvider" NOT NULL,
    status public."IntegrationStatus" DEFAULT 'PASSIVE'::public."IntegrationStatus" NOT NULL,
    "fromEmail" text NOT NULL,
    "fromName" text,
    "smtpHost" text,
    "smtpPort" integer,
    "smtpSecure" boolean DEFAULT false NOT NULL,
    "smtpUsernameEncrypted" text,
    "smtpPasswordEncrypted" text,
    "sendgridApiKeyEncrypted" text,
    "createdByUserId" text,
    "updatedByUserId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "expiresAt" timestamp(3) without time zone
);


--
-- Name: ManagerAssignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ManagerAssignment" (
    id text NOT NULL,
    "scopeType" public."ManagerScopeType" NOT NULL,
    "managerId" text NOT NULL,
    "siteId" text,
    "blockId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: NotificationLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."NotificationLog" (
    id text NOT NULL,
    channel public."NotificationChannel" NOT NULL,
    provider text,
    subject text,
    message text NOT NULL,
    "errorMessage" text,
    metadata jsonb,
    "sentAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdByUserId" text,
    "entityId" text,
    "entityType" text,
    "providerMessageId" text,
    "recipientEmail" text,
    "recipientPhone" text,
    "recipientUserId" text,
    "sourceType" public."NotificationSourceType" NOT NULL,
    status public."NotificationStatus" DEFAULT 'PENDING'::public."NotificationStatus" NOT NULL
);


--
-- Name: PasswordResetToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PasswordResetToken" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tokenHash" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "usedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PaymentAllocation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PaymentAllocation" (
    id text NOT NULL,
    "amountKurus" integer NOT NULL,
    status public."PaymentAllocationStatus" DEFAULT 'PENDING'::public."PaymentAllocationStatus" NOT NULL,
    "paidAt" timestamp(3) without time zone,
    "paymentBatchId" text NOT NULL,
    "apartmentId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PaymentBatch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PaymentBatch" (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    "totalAmountKurus" integer NOT NULL,
    "scopeType" public."PaymentScopeType" NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "siteId" text,
    "blockId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PaymentExemption; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PaymentExemption" (
    id text NOT NULL,
    "paymentBatchId" text NOT NULL,
    "apartmentId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PaymentReceipt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PaymentReceipt" (
    id text NOT NULL,
    "originalFileName" text NOT NULL,
    "storedFileName" text NOT NULL,
    "mimeType" text NOT NULL,
    "sizeBytes" integer NOT NULL,
    status public."ReceiptStatus" DEFAULT 'PENDING'::public."ReceiptStatus" NOT NULL,
    note text,
    "paymentAllocationId" text NOT NULL,
    "uploadedByUserId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "reviewNote" text,
    "reviewedAt" timestamp(3) without time zone,
    "reviewedByUserId" text,
    "aiAmountKurus" integer,
    "aiAnalyzedAt" timestamp(3) without time zone,
    "aiApartmentNumber" text,
    "aiConfidence" double precision,
    "aiDescription" text,
    "aiModelName" text,
    "aiPayerName" text,
    "aiPaymentDate" text,
    "aiProvider" public."AiProvider"
);


--
-- Name: ResidentRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ResidentRequest" (
    id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    type public."RequestType" NOT NULL,
    status public."RequestStatus" DEFAULT 'OPEN'::public."RequestStatus" NOT NULL,
    "apartmentId" text NOT NULL,
    "createdByUserId" text,
    "assignedToUserId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "attachmentMimeType" text,
    "attachmentOriginalFileName" text,
    "attachmentSizeBytes" integer,
    "attachmentStoredFileName" text
);


--
-- Name: Site; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Site" (
    id text NOT NULL,
    name text NOT NULL,
    address text NOT NULL,
    description text,
    "imageUrl" text,
    "hasElevator" boolean DEFAULT false NOT NULL,
    systems text[] DEFAULT ARRAY[]::text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


--
-- Name: SmsSetting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SmsSetting" (
    id text NOT NULL,
    provider public."SmsProvider" NOT NULL,
    status public."IntegrationStatus" DEFAULT 'PASSIVE'::public."IntegrationStatus" NOT NULL,
    "senderName" text,
    "apiKeyEncrypted" text,
    "apiSecretEncrypted" text,
    "usernameEncrypted" text,
    "passwordEncrypted" text,
    "accountSidEncrypted" text,
    "authTokenEncrypted" text,
    "fromPhone" text,
    "createdByUserId" text,
    "updatedByUserId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "expiresAt" timestamp(3) without time zone
);


--
-- Name: SystemSecuritySetting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SystemSecuritySetting" (
    id text NOT NULL,
    "sessionDurationMinutes" integer DEFAULT 60 NOT NULL,
    "minPasswordLength" integer DEFAULT 8 NOT NULL,
    "loginAttemptLimit" integer DEFAULT 5 NOT NULL,
    "lockDurationMinutes" integer DEFAULT 15 NOT NULL,
    "requireStrongPassword" boolean DEFAULT true NOT NULL,
    "enableTwoFactor" boolean DEFAULT false NOT NULL,
    "allowPublicRegister" boolean DEFAULT false NOT NULL,
    "logSecurityEvents" boolean DEFAULT true NOT NULL,
    "createdByUserId" text,
    "updatedByUserId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: SystemSetting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SystemSetting" (
    id text NOT NULL,
    "appName" text DEFAULT 'Sitesis'::text NOT NULL,
    "logoUrl" text,
    "contactEmail" text,
    "contactPhone" text,
    address text,
    "websiteUrl" text,
    "supportEmail" text,
    "supportPhone" text,
    "createdByUserId" text,
    "updatedByUserId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "fullName" text NOT NULL,
    email text NOT NULL,
    phone text,
    "passwordHash" text NOT NULL,
    role public."UserRole" NOT NULL,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "activeManagerAssignmentId" text
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: AccountingExpenseDocument AccountingExpenseDocument_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AccountingExpenseDocument"
    ADD CONSTRAINT "AccountingExpenseDocument_pkey" PRIMARY KEY (id);


--
-- Name: AccountingExpense AccountingExpense_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AccountingExpense"
    ADD CONSTRAINT "AccountingExpense_pkey" PRIMARY KEY (id);


--
-- Name: AiSetting AiSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AiSetting"
    ADD CONSTRAINT "AiSetting_pkey" PRIMARY KEY (id);


--
-- Name: AnnouncementRead AnnouncementRead_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AnnouncementRead"
    ADD CONSTRAINT "AnnouncementRead_pkey" PRIMARY KEY (id);


--
-- Name: Announcement Announcement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Announcement"
    ADD CONSTRAINT "Announcement_pkey" PRIMARY KEY (id);


--
-- Name: ApartmentResident ApartmentResident_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApartmentResident"
    ADD CONSTRAINT "ApartmentResident_pkey" PRIMARY KEY (id);


--
-- Name: Apartment Apartment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Apartment"
    ADD CONSTRAINT "Apartment_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: Block Block_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Block"
    ADD CONSTRAINT "Block_pkey" PRIMARY KEY (id);


--
-- Name: ContactMessage ContactMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContactMessage"
    ADD CONSTRAINT "ContactMessage_pkey" PRIMARY KEY (id);


--
-- Name: EmailSetting EmailSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmailSetting"
    ADD CONSTRAINT "EmailSetting_pkey" PRIMARY KEY (id);


--
-- Name: ManagerAssignment ManagerAssignment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ManagerAssignment"
    ADD CONSTRAINT "ManagerAssignment_pkey" PRIMARY KEY (id);


--
-- Name: NotificationLog NotificationLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NotificationLog"
    ADD CONSTRAINT "NotificationLog_pkey" PRIMARY KEY (id);


--
-- Name: PasswordResetToken PasswordResetToken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY (id);


--
-- Name: PaymentAllocation PaymentAllocation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentAllocation"
    ADD CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY (id);


--
-- Name: PaymentBatch PaymentBatch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentBatch"
    ADD CONSTRAINT "PaymentBatch_pkey" PRIMARY KEY (id);


--
-- Name: PaymentExemption PaymentExemption_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentExemption"
    ADD CONSTRAINT "PaymentExemption_pkey" PRIMARY KEY (id);


--
-- Name: PaymentReceipt PaymentReceipt_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentReceipt"
    ADD CONSTRAINT "PaymentReceipt_pkey" PRIMARY KEY (id);


--
-- Name: ResidentRequest ResidentRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ResidentRequest"
    ADD CONSTRAINT "ResidentRequest_pkey" PRIMARY KEY (id);


--
-- Name: Site Site_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Site"
    ADD CONSTRAINT "Site_pkey" PRIMARY KEY (id);


--
-- Name: SmsSetting SmsSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SmsSetting"
    ADD CONSTRAINT "SmsSetting_pkey" PRIMARY KEY (id);


--
-- Name: SystemSecuritySetting SystemSecuritySetting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SystemSecuritySetting"
    ADD CONSTRAINT "SystemSecuritySetting_pkey" PRIMARY KEY (id);


--
-- Name: SystemSetting SystemSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SystemSetting"
    ADD CONSTRAINT "SystemSetting_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AccountingExpenseDocument_expenseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AccountingExpenseDocument_expenseId_idx" ON public."AccountingExpenseDocument" USING btree ("expenseId");


--
-- Name: AccountingExpenseDocument_storedFileName_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AccountingExpenseDocument_storedFileName_key" ON public."AccountingExpenseDocument" USING btree ("storedFileName");


--
-- Name: AccountingExpenseDocument_uploadedByUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AccountingExpenseDocument_uploadedByUserId_idx" ON public."AccountingExpenseDocument" USING btree ("uploadedByUserId");


--
-- Name: AccountingExpense_blockId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AccountingExpense_blockId_idx" ON public."AccountingExpense" USING btree ("blockId");


--
-- Name: AccountingExpense_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AccountingExpense_category_idx" ON public."AccountingExpense" USING btree (category);


--
-- Name: AccountingExpense_createdByUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AccountingExpense_createdByUserId_idx" ON public."AccountingExpense" USING btree ("createdByUserId");


--
-- Name: AccountingExpense_expenseDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AccountingExpense_expenseDate_idx" ON public."AccountingExpense" USING btree ("expenseDate");


--
-- Name: AccountingExpense_paymentBatchId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AccountingExpense_paymentBatchId_key" ON public."AccountingExpense" USING btree ("paymentBatchId");


--
-- Name: AccountingExpense_siteId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AccountingExpense_siteId_idx" ON public."AccountingExpense" USING btree ("siteId");


--
-- Name: AccountingExpense_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AccountingExpense_status_idx" ON public."AccountingExpense" USING btree (status);


--
-- Name: AiSetting_cooldownUntil_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiSetting_cooldownUntil_idx" ON public."AiSetting" USING btree ("cooldownUntil");


--
-- Name: AiSetting_createdByUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiSetting_createdByUserId_idx" ON public."AiSetting" USING btree ("createdByUserId");


--
-- Name: AiSetting_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiSetting_expiresAt_idx" ON public."AiSetting" USING btree ("expiresAt");


--
-- Name: AiSetting_priority_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiSetting_priority_idx" ON public."AiSetting" USING btree (priority);


--
-- Name: AiSetting_provider_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiSetting_provider_idx" ON public."AiSetting" USING btree (provider);


--
-- Name: AiSetting_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiSetting_status_idx" ON public."AiSetting" USING btree (status);


--
-- Name: AiSetting_updatedByUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AiSetting_updatedByUserId_idx" ON public."AiSetting" USING btree ("updatedByUserId");


--
-- Name: AnnouncementRead_announcementId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AnnouncementRead_announcementId_idx" ON public."AnnouncementRead" USING btree ("announcementId");


--
-- Name: AnnouncementRead_announcementId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AnnouncementRead_announcementId_userId_key" ON public."AnnouncementRead" USING btree ("announcementId", "userId");


--
-- Name: AnnouncementRead_readAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AnnouncementRead_readAt_idx" ON public."AnnouncementRead" USING btree ("readAt");


--
-- Name: AnnouncementRead_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AnnouncementRead_userId_idx" ON public."AnnouncementRead" USING btree ("userId");


--
-- Name: Announcement_apartmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Announcement_apartmentId_idx" ON public."Announcement" USING btree ("apartmentId");


--
-- Name: Announcement_blockId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Announcement_blockId_idx" ON public."Announcement" USING btree ("blockId");


--
-- Name: Announcement_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Announcement_createdAt_idx" ON public."Announcement" USING btree ("createdAt");


--
-- Name: Announcement_createdByUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Announcement_createdByUserId_idx" ON public."Announcement" USING btree ("createdByUserId");


--
-- Name: Announcement_siteId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Announcement_siteId_idx" ON public."Announcement" USING btree ("siteId");


--
-- Name: Announcement_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Announcement_status_idx" ON public."Announcement" USING btree (status);


--
-- Name: Announcement_targetType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Announcement_targetType_idx" ON public."Announcement" USING btree ("targetType");


--
-- Name: ApartmentResident_apartmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ApartmentResident_apartmentId_idx" ON public."ApartmentResident" USING btree ("apartmentId");


--
-- Name: ApartmentResident_apartmentId_userId_type_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ApartmentResident_apartmentId_userId_type_key" ON public."ApartmentResident" USING btree ("apartmentId", "userId", type);


--
-- Name: ApartmentResident_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ApartmentResident_userId_idx" ON public."ApartmentResident" USING btree ("userId");


--
-- Name: Apartment_blockId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Apartment_blockId_idx" ON public."Apartment" USING btree ("blockId");


--
-- Name: Apartment_blockId_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Apartment_blockId_number_key" ON public."Apartment" USING btree ("blockId", number);


--
-- Name: AuditLog_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_action_idx" ON public."AuditLog" USING btree (action);


--
-- Name: AuditLog_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_createdAt_idx" ON public."AuditLog" USING btree ("createdAt");


--
-- Name: AuditLog_entityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_entityId_idx" ON public."AuditLog" USING btree ("entityId");


--
-- Name: AuditLog_entityType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_entityType_idx" ON public."AuditLog" USING btree ("entityType");


--
-- Name: AuditLog_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_userId_idx" ON public."AuditLog" USING btree ("userId");


--
-- Name: Block_siteId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Block_siteId_idx" ON public."Block" USING btree ("siteId");


--
-- Name: ContactMessage_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContactMessage_createdAt_idx" ON public."ContactMessage" USING btree ("createdAt");


--
-- Name: ContactMessage_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContactMessage_email_idx" ON public."ContactMessage" USING btree (email);


--
-- Name: ContactMessage_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContactMessage_status_idx" ON public."ContactMessage" USING btree (status);


--
-- Name: EmailSetting_createdByUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmailSetting_createdByUserId_idx" ON public."EmailSetting" USING btree ("createdByUserId");


--
-- Name: EmailSetting_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmailSetting_expiresAt_idx" ON public."EmailSetting" USING btree ("expiresAt");


--
-- Name: EmailSetting_provider_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmailSetting_provider_idx" ON public."EmailSetting" USING btree (provider);


--
-- Name: EmailSetting_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmailSetting_status_idx" ON public."EmailSetting" USING btree (status);


--
-- Name: EmailSetting_updatedByUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmailSetting_updatedByUserId_idx" ON public."EmailSetting" USING btree ("updatedByUserId");


--
-- Name: ManagerAssignment_blockId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ManagerAssignment_blockId_idx" ON public."ManagerAssignment" USING btree ("blockId");


--
-- Name: ManagerAssignment_managerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ManagerAssignment_managerId_idx" ON public."ManagerAssignment" USING btree ("managerId");


--
-- Name: ManagerAssignment_scopeType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ManagerAssignment_scopeType_idx" ON public."ManagerAssignment" USING btree ("scopeType");


--
-- Name: ManagerAssignment_siteId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ManagerAssignment_siteId_idx" ON public."ManagerAssignment" USING btree ("siteId");


--
-- Name: NotificationLog_channel_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NotificationLog_channel_idx" ON public."NotificationLog" USING btree (channel);


--
-- Name: NotificationLog_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NotificationLog_createdAt_idx" ON public."NotificationLog" USING btree ("createdAt");


--
-- Name: NotificationLog_createdByUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NotificationLog_createdByUserId_idx" ON public."NotificationLog" USING btree ("createdByUserId");


--
-- Name: NotificationLog_entityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NotificationLog_entityId_idx" ON public."NotificationLog" USING btree ("entityId");


--
-- Name: NotificationLog_entityType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NotificationLog_entityType_idx" ON public."NotificationLog" USING btree ("entityType");


--
-- Name: NotificationLog_recipientUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NotificationLog_recipientUserId_idx" ON public."NotificationLog" USING btree ("recipientUserId");


--
-- Name: NotificationLog_sourceType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NotificationLog_sourceType_idx" ON public."NotificationLog" USING btree ("sourceType");


--
-- Name: NotificationLog_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NotificationLog_status_idx" ON public."NotificationLog" USING btree (status);


--
-- Name: PasswordResetToken_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PasswordResetToken_expiresAt_idx" ON public."PasswordResetToken" USING btree ("expiresAt");


--
-- Name: PasswordResetToken_tokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON public."PasswordResetToken" USING btree ("tokenHash");


--
-- Name: PasswordResetToken_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PasswordResetToken_userId_idx" ON public."PasswordResetToken" USING btree ("userId");


--
-- Name: PaymentAllocation_apartmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaymentAllocation_apartmentId_idx" ON public."PaymentAllocation" USING btree ("apartmentId");


--
-- Name: PaymentAllocation_paymentBatchId_apartmentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PaymentAllocation_paymentBatchId_apartmentId_key" ON public."PaymentAllocation" USING btree ("paymentBatchId", "apartmentId");


--
-- Name: PaymentAllocation_paymentBatchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaymentAllocation_paymentBatchId_idx" ON public."PaymentAllocation" USING btree ("paymentBatchId");


--
-- Name: PaymentBatch_blockId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaymentBatch_blockId_idx" ON public."PaymentBatch" USING btree ("blockId");


--
-- Name: PaymentBatch_scopeType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaymentBatch_scopeType_idx" ON public."PaymentBatch" USING btree ("scopeType");


--
-- Name: PaymentBatch_siteId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaymentBatch_siteId_idx" ON public."PaymentBatch" USING btree ("siteId");


--
-- Name: PaymentExemption_apartmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaymentExemption_apartmentId_idx" ON public."PaymentExemption" USING btree ("apartmentId");


--
-- Name: PaymentExemption_paymentBatchId_apartmentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PaymentExemption_paymentBatchId_apartmentId_key" ON public."PaymentExemption" USING btree ("paymentBatchId", "apartmentId");


--
-- Name: PaymentExemption_paymentBatchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaymentExemption_paymentBatchId_idx" ON public."PaymentExemption" USING btree ("paymentBatchId");


--
-- Name: PaymentReceipt_aiAnalyzedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaymentReceipt_aiAnalyzedAt_idx" ON public."PaymentReceipt" USING btree ("aiAnalyzedAt");


--
-- Name: PaymentReceipt_aiProvider_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaymentReceipt_aiProvider_idx" ON public."PaymentReceipt" USING btree ("aiProvider");


--
-- Name: PaymentReceipt_paymentAllocationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaymentReceipt_paymentAllocationId_idx" ON public."PaymentReceipt" USING btree ("paymentAllocationId");


--
-- Name: PaymentReceipt_reviewedByUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaymentReceipt_reviewedByUserId_idx" ON public."PaymentReceipt" USING btree ("reviewedByUserId");


--
-- Name: PaymentReceipt_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaymentReceipt_status_idx" ON public."PaymentReceipt" USING btree (status);


--
-- Name: PaymentReceipt_uploadedByUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PaymentReceipt_uploadedByUserId_idx" ON public."PaymentReceipt" USING btree ("uploadedByUserId");


--
-- Name: ResidentRequest_apartmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ResidentRequest_apartmentId_idx" ON public."ResidentRequest" USING btree ("apartmentId");


--
-- Name: ResidentRequest_assignedToUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ResidentRequest_assignedToUserId_idx" ON public."ResidentRequest" USING btree ("assignedToUserId");


--
-- Name: ResidentRequest_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ResidentRequest_createdAt_idx" ON public."ResidentRequest" USING btree ("createdAt");


--
-- Name: ResidentRequest_createdByUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ResidentRequest_createdByUserId_idx" ON public."ResidentRequest" USING btree ("createdByUserId");


--
-- Name: ResidentRequest_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ResidentRequest_status_idx" ON public."ResidentRequest" USING btree (status);


--
-- Name: ResidentRequest_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ResidentRequest_type_idx" ON public."ResidentRequest" USING btree (type);


--
-- Name: SmsSetting_createdByUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SmsSetting_createdByUserId_idx" ON public."SmsSetting" USING btree ("createdByUserId");


--
-- Name: SmsSetting_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SmsSetting_expiresAt_idx" ON public."SmsSetting" USING btree ("expiresAt");


--
-- Name: SmsSetting_provider_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SmsSetting_provider_idx" ON public."SmsSetting" USING btree (provider);


--
-- Name: SmsSetting_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SmsSetting_status_idx" ON public."SmsSetting" USING btree (status);


--
-- Name: SmsSetting_updatedByUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SmsSetting_updatedByUserId_idx" ON public."SmsSetting" USING btree ("updatedByUserId");


--
-- Name: SystemSecuritySetting_createdByUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SystemSecuritySetting_createdByUserId_idx" ON public."SystemSecuritySetting" USING btree ("createdByUserId");


--
-- Name: SystemSecuritySetting_updatedByUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SystemSecuritySetting_updatedByUserId_idx" ON public."SystemSecuritySetting" USING btree ("updatedByUserId");


--
-- Name: SystemSetting_createdByUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SystemSetting_createdByUserId_idx" ON public."SystemSetting" USING btree ("createdByUserId");


--
-- Name: SystemSetting_updatedByUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SystemSetting_updatedByUserId_idx" ON public."SystemSetting" USING btree ("updatedByUserId");


--
-- Name: User_activeManagerAssignmentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_activeManagerAssignmentId_key" ON public."User" USING btree ("activeManagerAssignmentId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: AccountingExpenseDocument AccountingExpenseDocument_expenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AccountingExpenseDocument"
    ADD CONSTRAINT "AccountingExpenseDocument_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES public."AccountingExpense"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AccountingExpenseDocument AccountingExpenseDocument_uploadedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AccountingExpenseDocument"
    ADD CONSTRAINT "AccountingExpenseDocument_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AccountingExpense AccountingExpense_blockId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AccountingExpense"
    ADD CONSTRAINT "AccountingExpense_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES public."Block"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AccountingExpense AccountingExpense_cancelledByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AccountingExpense"
    ADD CONSTRAINT "AccountingExpense_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AccountingExpense AccountingExpense_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AccountingExpense"
    ADD CONSTRAINT "AccountingExpense_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AccountingExpense AccountingExpense_paymentBatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AccountingExpense"
    ADD CONSTRAINT "AccountingExpense_paymentBatchId_fkey" FOREIGN KEY ("paymentBatchId") REFERENCES public."PaymentBatch"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AccountingExpense AccountingExpense_siteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AccountingExpense"
    ADD CONSTRAINT "AccountingExpense_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES public."Site"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AiSetting AiSetting_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AiSetting"
    ADD CONSTRAINT "AiSetting_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AiSetting AiSetting_updatedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AiSetting"
    ADD CONSTRAINT "AiSetting_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AnnouncementRead AnnouncementRead_announcementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AnnouncementRead"
    ADD CONSTRAINT "AnnouncementRead_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES public."Announcement"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AnnouncementRead AnnouncementRead_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AnnouncementRead"
    ADD CONSTRAINT "AnnouncementRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Announcement Announcement_apartmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Announcement"
    ADD CONSTRAINT "Announcement_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES public."Apartment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Announcement Announcement_blockId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Announcement"
    ADD CONSTRAINT "Announcement_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES public."Block"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Announcement Announcement_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Announcement"
    ADD CONSTRAINT "Announcement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Announcement Announcement_siteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Announcement"
    ADD CONSTRAINT "Announcement_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES public."Site"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ApartmentResident ApartmentResident_apartmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApartmentResident"
    ADD CONSTRAINT "ApartmentResident_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES public."Apartment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ApartmentResident ApartmentResident_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApartmentResident"
    ADD CONSTRAINT "ApartmentResident_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Apartment Apartment_blockId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Apartment"
    ADD CONSTRAINT "Apartment_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES public."Block"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AuditLog AuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Block Block_siteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Block"
    ADD CONSTRAINT "Block_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES public."Site"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EmailSetting EmailSetting_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmailSetting"
    ADD CONSTRAINT "EmailSetting_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EmailSetting EmailSetting_updatedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmailSetting"
    ADD CONSTRAINT "EmailSetting_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ManagerAssignment ManagerAssignment_blockId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ManagerAssignment"
    ADD CONSTRAINT "ManagerAssignment_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES public."Block"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ManagerAssignment ManagerAssignment_managerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ManagerAssignment"
    ADD CONSTRAINT "ManagerAssignment_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ManagerAssignment ManagerAssignment_siteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ManagerAssignment"
    ADD CONSTRAINT "ManagerAssignment_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES public."Site"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: NotificationLog NotificationLog_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NotificationLog"
    ADD CONSTRAINT "NotificationLog_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: NotificationLog NotificationLog_recipientUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NotificationLog"
    ADD CONSTRAINT "NotificationLog_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PasswordResetToken PasswordResetToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PaymentAllocation PaymentAllocation_apartmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentAllocation"
    ADD CONSTRAINT "PaymentAllocation_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES public."Apartment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PaymentAllocation PaymentAllocation_paymentBatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentAllocation"
    ADD CONSTRAINT "PaymentAllocation_paymentBatchId_fkey" FOREIGN KEY ("paymentBatchId") REFERENCES public."PaymentBatch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PaymentBatch PaymentBatch_blockId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentBatch"
    ADD CONSTRAINT "PaymentBatch_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES public."Block"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PaymentBatch PaymentBatch_siteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentBatch"
    ADD CONSTRAINT "PaymentBatch_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES public."Site"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PaymentExemption PaymentExemption_apartmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentExemption"
    ADD CONSTRAINT "PaymentExemption_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES public."Apartment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PaymentExemption PaymentExemption_paymentBatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentExemption"
    ADD CONSTRAINT "PaymentExemption_paymentBatchId_fkey" FOREIGN KEY ("paymentBatchId") REFERENCES public."PaymentBatch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PaymentReceipt PaymentReceipt_paymentAllocationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentReceipt"
    ADD CONSTRAINT "PaymentReceipt_paymentAllocationId_fkey" FOREIGN KEY ("paymentAllocationId") REFERENCES public."PaymentAllocation"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PaymentReceipt PaymentReceipt_reviewedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentReceipt"
    ADD CONSTRAINT "PaymentReceipt_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PaymentReceipt PaymentReceipt_uploadedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentReceipt"
    ADD CONSTRAINT "PaymentReceipt_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ResidentRequest ResidentRequest_apartmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ResidentRequest"
    ADD CONSTRAINT "ResidentRequest_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES public."Apartment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ResidentRequest ResidentRequest_assignedToUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ResidentRequest"
    ADD CONSTRAINT "ResidentRequest_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ResidentRequest ResidentRequest_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ResidentRequest"
    ADD CONSTRAINT "ResidentRequest_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SmsSetting SmsSetting_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SmsSetting"
    ADD CONSTRAINT "SmsSetting_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SmsSetting SmsSetting_updatedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SmsSetting"
    ADD CONSTRAINT "SmsSetting_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SystemSecuritySetting SystemSecuritySetting_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SystemSecuritySetting"
    ADD CONSTRAINT "SystemSecuritySetting_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SystemSecuritySetting SystemSecuritySetting_updatedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SystemSecuritySetting"
    ADD CONSTRAINT "SystemSecuritySetting_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SystemSetting SystemSetting_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SystemSetting"
    ADD CONSTRAINT "SystemSetting_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SystemSetting SystemSetting_updatedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SystemSetting"
    ADD CONSTRAINT "SystemSetting_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: User User_activeManagerAssignmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_activeManagerAssignmentId_fkey" FOREIGN KEY ("activeManagerAssignmentId") REFERENCES public."ManagerAssignment"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict 1GD81PImVXtKafff2X1qEiltN5km7uOvtQWdzAiU7yQFYFzu9afilFeOOyldJPO

