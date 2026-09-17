import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  User,
  Users,
  Home,
  GraduationCap,
  CreditCard,
  FileText,
  DollarSign,
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Sparkles,
  Printer,
  ShieldCheck,
  RotateCcw,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { MemberService, FeeService } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { usePrinter } from '../context/PrinterContext';

export interface StudentEnrollmentProps {
  onBack: () => void;
  onSuccess: () => void;
  initialFeeGroupId?: string;
  editStudent?: any | null;
}

type StepKey = 'identity' | 'parents' | 'address' | 'previous' | 'fees' | 'documents' | 'initialPayment';

export const StudentEnrollment: React.FC<StudentEnrollmentProps> = ({
  onBack,
  onSuccess,
  initialFeeGroupId,
  editStudent,
}) => {
  const { selectedYearId, entityName } = useAuth();
  const { printReceiptHtml, paperSize } = usePrinter();

  const [activeStep, setActiveStep] = useState<StepKey>('identity');
  const [feeGroups, setFeeGroups] = useState<any[]>([]);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Step 1: Identity & Demographics ──
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [admissionNo, setAdmissionNo] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [apaarId, setApaarId] = useState('');
  const [aadhaarNo, setAadhaarNo] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('male');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [nationality, setNationality] = useState('Indian');
  const [motherTongue, setMotherTongue] = useState('');
  const [religion, setReligion] = useState('Hindu');
  const [casteCategory, setCasteCategory] = useState('General');
  const [subCaste, setSubCaste] = useState('');
  const [bloodGroup, setBloodGroup] = useState('N/A');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [identificationMarks, setIdentificationMarks] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().slice(0, 10));

  // ── Step 2: Parents & Guardian ──
  const [fatherName, setFatherName] = useState('');
  const [fatherPhone, setFatherPhone] = useState('');
  const [fatherAadhaar, setFatherAadhaar] = useState('');
  const [fatherOccupation, setFatherOccupation] = useState('');
  const [fatherQualification, setFatherQualification] = useState('');
  const [fatherIncome, setFatherIncome] = useState('');
  const [fatherEmail, setFatherEmail] = useState('');

  const [motherName, setMotherName] = useState('');
  const [motherPhone, setMotherPhone] = useState('');
  const [motherAadhaar, setMotherAadhaar] = useState('');
  const [motherOccupation, setMotherOccupation] = useState('');
  const [motherQualification, setMotherQualification] = useState('');
  const [motherIncome, setMotherIncome] = useState('');
  const [motherEmail, setMotherEmail] = useState('');

  const [guardianName, setGuardianName] = useState('');
  const [guardianRelation, setGuardianRelation] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianAddress, setGuardianAddress] = useState('');

  // ── Step 3: Address & Emergency ──
  const [presentAddress, setPresentAddress] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [sameAddress, setSameAddress] = useState(true);
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');

  // ── Step 4: Previous Academic History ──
  const [previousSchoolName, setPreviousSchoolName] = useState('');
  const [previousBoard, setPreviousBoard] = useState('');
  const [previousClassPassed, setPreviousClassPassed] = useState('');
  const [tcNumber, setTcNumber] = useState('');
  const [tcDate, setTcDate] = useState('');
  const [previousPercentage, setPreviousPercentage] = useState('');

  // ── Step 5: Class, Fee Package & Concession ──
  const [feeGroupId, setFeeGroupId] = useState(initialFeeGroupId || '');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [addonFeeIds, setAddonFeeIds] = useState<string[]>([]);
  const [concessionType, setConcessionType] = useState('none');
  const [concessionMode, setConcessionMode] = useState<'fixed' | 'percentage'>('fixed');
  const [concessionValue, setConcessionValue] = useState('');
  const [concessionReason, setConcessionReason] = useState('');

  // ── Step 6: Documents & Certificates ──
  const [documents, setDocuments] = useState<Array<{ title: string; url: string; docType: string }>>([]);
  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docType, setDocType] = useState('birth_certificate');
  const [showDocInput, setShowDocInput] = useState(false);

  // ── Step 7: Initial Payment on Admission (Optional POS) ──
  const [collectInitialPayment, setCollectInitialPayment] = useState(false);
  const [initialPaymentAmount, setInitialPaymentAmount] = useState('');
  const [initialPaymentMethod, setInitialPaymentMethod] = useState('cash');
  const [initialPaymentNotes, setInitialPaymentNotes] = useState('Admission & Tuition Fee');
  const [printReceiptOnSave, setPrintReceiptOnSave] = useState(true);

  // Load classes and fee packages
  useEffect(() => {
    const loadMasterData = async () => {
      setLoadingData(true);
      try {
        const [grpRes, structRes] = await Promise.all([
          FeeService.getGroups(),
          FeeService.getStructures(),
        ]);
        if (grpRes.data) setFeeGroups(grpRes.data);
        if (structRes.data) setFeeStructures(structRes.data);

        // Populate fields if editing
        if (editStudent) {
          setFirstName(editStudent.firstName || '');
          setMiddleName(editStudent.middleName || '');
          setLastName(editStudent.lastName || '');
          setAdmissionNo(editStudent.admissionNo || editStudent.knownId || '');
          setRollNo(editStudent.rollNo || '');
          setApaarId(editStudent.apaarId || '');
          setAadhaarNo(editStudent.aadhaarNo || '');
          setDob(editStudent.dob ? editStudent.dob.slice(0, 10) : '');
          setGender(editStudent.gender || 'male');
          setPlaceOfBirth(editStudent.placeOfBirth || '');
          setNationality(editStudent.nationality || 'Indian');
          setMotherTongue(editStudent.motherTongue || '');
          setReligion(editStudent.religion || 'Hindu');
          setCasteCategory(editStudent.casteCategory || 'General');
          setSubCaste(editStudent.subCaste || '');
          setBloodGroup(editStudent.bloodGroup || 'N/A');
          setMedicalNotes(editStudent.medicalNotes || '');
          setIdentificationMarks(editStudent.identificationMarks || '');
          setJoiningDate(editStudent.joiningDate ? editStudent.joiningDate.slice(0, 10) : new Date().toISOString().slice(0, 10));

          setFatherName(editStudent.fatherName || '');
          setFatherPhone(editStudent.fatherPhone || editStudent.contact || '');
          setFatherAadhaar(editStudent.fatherAadhaar || '');
          setFatherOccupation(editStudent.fatherOccupation || '');
          setFatherQualification(editStudent.fatherQualification || '');
          setFatherIncome(editStudent.fatherIncome || '');
          setFatherEmail(editStudent.fatherEmail || '');

          setMotherName(editStudent.motherName || '');
          setMotherPhone(editStudent.motherPhone || editStudent.altContact || '');
          setMotherAadhaar(editStudent.motherAadhaar || '');
          setMotherOccupation(editStudent.motherOccupation || '');
          setMotherQualification(editStudent.motherQualification || '');
          setMotherIncome(editStudent.motherIncome || '');
          setMotherEmail(editStudent.motherEmail || '');

          setGuardianName(editStudent.guardianName || '');
          setGuardianRelation(editStudent.guardianRelation || '');
          setGuardianPhone(editStudent.guardianPhone || '');
          setGuardianAddress(editStudent.guardianAddress || '');

          setPresentAddress(editStudent.presentAddress || editStudent.address || '');
          setPermanentAddress(editStudent.permanentAddress || '');
          setSameAddress(!editStudent.permanentAddress || editStudent.permanentAddress === (editStudent.presentAddress || editStudent.address));
          setCity(editStudent.city || '');
          setDistrict(editStudent.district || '');
          setState(editStudent.state || '');
          setPincode(editStudent.pincode || '');
          setEmergencyName(editStudent.emergencyContactName || '');
          setEmergencyPhone(editStudent.emergencyContactPhone || '');
          setEmergencyRelation(editStudent.emergencyContactRelation || '');

          setPreviousSchoolName(editStudent.previousSchoolName || '');
          setPreviousBoard(editStudent.previousBoard || '');
          setPreviousClassPassed(editStudent.previousClassPassed || '');
          setTcNumber(editStudent.tcNumber || '');
          setTcDate(editStudent.tcDate ? editStudent.tcDate.slice(0, 10) : '');
          setPreviousPercentage(editStudent.previousPercentage || '');

          setFeeGroupId(editStudent.feeGroupId || initialFeeGroupId || '');
          setSelectedPlanId(editStudent.feeStructureId || '');
          setAddonFeeIds(editStudent.addonFeeIds || []);
          setConcessionType(editStudent.concessionType || 'none');
          setConcessionMode(editStudent.concessionMode || (editStudent.concessionValue && Number(editStudent.concessionValue) <= 100 ? 'percentage' : 'fixed'));
          setConcessionValue(editStudent.concessionValue ? String(editStudent.concessionValue) : '');
          setConcessionReason(editStudent.concessionReason || '');

          setDocuments(editStudent.documents || []);
        } else {
          if (initialFeeGroupId) {
            setFeeGroupId(initialFeeGroupId);
          }
          try {
            const nextRes = await MemberService.getNextAdmissionNo();
            if (nextRes?.data?.nextAdmissionNo) {
              setAdmissionNo(nextRes.data.nextAdmissionNo);
            }
          } catch (e) {
            if (!admissionNo) {
              setAdmissionNo(`ADM-${new Date().getFullYear()}-0001`);
            }
          }
        }
      } catch (err) {
        console.error('Error loading enrollment master data:', err);
      } finally {
        setLoadingData(false);
      }
    };

    loadMasterData();
  }, [editStudent, initialFeeGroupId]);

  // Load next roll number when class is selected for new enrollment
  useEffect(() => {
    if (!editStudent && feeGroupId) {
      MemberService.getNextRollNo({ feeGroupId })
        .then((res) => {
          if (res?.data?.nextRollNo) {
            setRollNo(res.data.nextRollNo);
          }
        })
        .catch((e) => console.error('Error fetching next roll no:', e));
    }
  }, [feeGroupId, editStudent]);

  // Filter fee structures
  const primaryStructures = feeStructures.filter((s) => !s.isAddon);
  const addonStructures = feeStructures.filter((s) => s.isAddon);
  const relevantPrimaryStructures = feeGroupId
    ? primaryStructures.filter(
        (s) => s.feeGroupId === feeGroupId || s.feeGroupIds?.includes(feeGroupId) || !s.feeGroupId
      )
    : primaryStructures;

  const handleSelectPrimaryPlan = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = feeStructures.find((s) => s._id === planId);
    if (plan && !initialPaymentAmount) {
      setInitialPaymentAmount(String(plan.amount));
    }
  };

  const toggleAddon = (addonId: string) => {
    setAddonFeeIds((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  const handleAddDocument = (title: string, url: string, type: string) => {
    if (!title.trim()) return;
    setDocuments((prev) => [...prev, { title: title.trim(), url: url.trim(), docType: type }]);
    setDocTitle('');
    setDocUrl('');
    setShowDocInput(false);
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!firstName.trim()) {
      setActiveStep('identity');
      alert('First Name is required');
      return;
    }
    if (!lastName.trim()) {
      setActiveStep('identity');
      alert('Last Name is required');
      return;
    }

    const cleanedFatherPhone = fatherPhone.replace(/\D/g, '').slice(0, 10);
    const cleanedMotherPhone = motherPhone.replace(/\D/g, '').slice(0, 10);

    setSubmitting(true);
    try {
      const finalPermAddress = sameAddress ? presentAddress.trim() : permanentAddress.trim();
      const adm = admissionNo.trim() || `ADM-${Date.now().toString().slice(-6)}`;

      const payload: any = {
        firstName: firstName.trim(),
        middleName: middleName.trim() || undefined,
        lastName: lastName.trim(),
        admissionNo: adm,
        knownId: adm,
        rollNo: rollNo.trim() || undefined,
        apaarId: apaarId.trim() || undefined,
        aadhaarNo: aadhaarNo.replace(/\D/g, '').slice(0, 12) || undefined,
        dob: dob || undefined,
        gender,
        placeOfBirth: placeOfBirth.trim() || undefined,
        nationality: nationality.trim() || 'Indian',
        motherTongue: motherTongue.trim() || undefined,
        religion: religion.trim() || undefined,
        casteCategory: casteCategory || 'General',
        subCaste: subCaste.trim() || undefined,
        bloodGroup: bloodGroup || 'N/A',
        medicalNotes: medicalNotes.trim() || undefined,
        identificationMarks: identificationMarks.trim() || undefined,
        joiningDate: joiningDate || undefined,

        fatherName: fatherName.trim() || undefined,
        fatherPhone: cleanedFatherPhone || undefined,
        contact: cleanedFatherPhone || cleanedMotherPhone || undefined,
        fatherAadhaar: fatherAadhaar.replace(/\D/g, '').slice(0, 12) || undefined,
        fatherOccupation: fatherOccupation.trim() || undefined,
        fatherQualification: fatherQualification.trim() || undefined,
        fatherIncome: fatherIncome.trim() || undefined,
        fatherEmail: fatherEmail.trim() || undefined,

        motherName: motherName.trim() || undefined,
        motherPhone: cleanedMotherPhone || undefined,
        altContact: cleanedMotherPhone || undefined,
        motherAadhaar: motherAadhaar.replace(/\D/g, '').slice(0, 12) || undefined,
        motherOccupation: motherOccupation.trim() || undefined,
        motherQualification: motherQualification.trim() || undefined,
        motherIncome: motherIncome.trim() || undefined,
        motherEmail: motherEmail.trim() || undefined,

        guardianName: guardianName.trim() || undefined,
        guardianRelation: guardianRelation.trim() || undefined,
        guardianPhone: guardianPhone.replace(/\D/g, '').slice(0, 10) || undefined,
        guardianAddress: guardianAddress.trim() || undefined,

        presentAddress: presentAddress.trim() || undefined,
        address: presentAddress.trim() || undefined,
        permanentAddress: finalPermAddress || undefined,
        city: city.trim() || undefined,
        district: district.trim() || undefined,
        state: state.trim() || undefined,
        pincode: pincode.replace(/\D/g, '').slice(0, 6) || undefined,
        emergencyContactName: emergencyName.trim() || undefined,
        emergencyContactPhone: emergencyPhone.replace(/\D/g, '').slice(0, 10) || undefined,
        emergencyContactRelation: emergencyRelation.trim() || undefined,

        previousSchoolName: previousSchoolName.trim() || undefined,
        previousBoard: previousBoard.trim() || undefined,
        previousClassPassed: previousClassPassed.trim() || undefined,
        tcNumber: tcNumber.trim() || undefined,
        tcDate: tcDate || undefined,
        previousPercentage: previousPercentage.trim() || undefined,

        feeGroupId: feeGroupId || undefined,
        feeStructureId: selectedPlanId || undefined,
        addonFeeIds: addonFeeIds.length > 0 ? addonFeeIds : undefined,
        concessionType: concessionType !== 'none' ? concessionType : undefined,
        concessionMode: concessionType !== 'none' ? concessionMode : undefined,
        concessionValue: concessionValue ? Number(concessionValue) : undefined,
        concessionReason: concessionReason.trim() || undefined,
        documents: documents.length > 0 ? documents : undefined,
        academicYearId: selectedYearId || undefined,
      };

      let savedStudent: any;
      if (editStudent?._id) {
        const res = await MemberService.update(editStudent._id, payload);
        savedStudent = res.data?.member || res.data || editStudent;
      } else {
        const res = await MemberService.create(payload);
        savedStudent = res.data?.member || res.data;

        // If Initial POS fee payment was collected
        if (collectInitialPayment && Number(initialPaymentAmount) > 0 && savedStudent?._id) {
          try {
            const payRes = await FeeService.createPayment({
              memberId: savedStudent._id,
              feeGroupId: feeGroupId || undefined,
              amount: Number(initialPaymentAmount),
              paymentMethod: initialPaymentMethod,
              paymentDate: new Date().toISOString(),
              notes: initialPaymentNotes || 'Admission Fee Collection',
              academicYearId: selectedYearId || undefined,
            });

            if (printReceiptOnSave) {
              const payment = payRes.data?.payment || payRes.data;
              const studentName = `${firstName} ${lastName}`;
              const receiptNo = payment?.receiptNo || `REC-${Date.now().toString().slice(-6)}`;
              const receiptHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8"/>
                  <style>
                    body { font-family: 'Courier New', monospace; font-size: 12px; padding: 8px; width: ${paperSize === '58mm' ? '54mm' : '76mm'}; }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .font-bold { font-weight: bold; }
                    .divider { border-top: 1px dashed #000; margin: 6px 0; }
                  </style>
                </head>
                <body>
                  <div class="text-center font-bold" style="font-size: 14px;">${entityName || 'SCHOOL ERP'}</div>
                  <div class="text-center" style="font-size: 10px;">ADMISSION FEE RECEIPT</div>
                  <div class="divider"></div>
                  <table>
                    <tr><td>Receipt #:</td><td class="text-right font-bold">${receiptNo}</td></tr>
                    <tr><td>Date:</td><td class="text-right">${new Date().toLocaleString('en-IN')}</td></tr>
                    <tr><td>Adm No:</td><td class="text-right font-bold">${adm}</td></tr>
                    <tr><td>Student:</td><td class="text-right font-bold">${studentName}</td></tr>
                    <tr><td>Mode:</td><td class="text-right font-bold">${initialPaymentMethod.toUpperCase()}</td></tr>
                  </table>
                  <div class="divider"></div>
                  <table>
                    <tr class="font-bold"><td>Particulars</td><td class="text-right">Amount</td></tr>
                    <tr><td>${initialPaymentNotes}</td><td class="text-right">₹${Number(initialPaymentAmount).toLocaleString('en-IN')}</td></tr>
                  </table>
                  <div class="divider"></div>
                  <table>
                    <tr class="font-bold" style="font-size: 13px;">
                      <td>TOTAL PAID:</td>
                      <td class="text-right">₹${Number(initialPaymentAmount).toLocaleString('en-IN')}</td>
                    </tr>
                  </table>
                  <div class="divider"></div>
                  <div class="text-center" style="font-size: 10px; margin-top: 6px;">
                    *** Admission Confirmed ***
                  </div>
                </body>
                </html>
              `;
              await printReceiptHtml(receiptHtml);
            }
          } catch (payErr: any) {
            console.error('Initial payment error:', payErr);
            alert('Student was created, but initial payment collection failed: ' + payErr.message);
          }
        }
      }

      onSuccess();
    } catch (err: any) {
      alert('Failed to save student: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const steps: Array<{ id: StepKey; title: string; subtitle: string; icon: React.ReactNode; isComplete: boolean }> = [
    {
      id: 'identity',
      title: 'Identity & Demographics',
      subtitle: 'Name, SR No, Aadhaar, DOB, Caste',
      icon: <User size={18} />,
      isComplete: Boolean(firstName.trim() && lastName.trim() && admissionNo.trim()),
    },
    {
      id: 'parents',
      title: 'Parents & Family KYC',
      subtitle: 'Father & mother phone, Aadhaar, jobs',
      icon: <Users size={18} />,
      isComplete: Boolean(fatherName.trim() || motherName.trim()),
    },
    {
      id: 'address',
      title: 'Address & SOS Contact',
      subtitle: 'Residential address, city, PIN, emergency',
      icon: <Home size={18} />,
      isComplete: Boolean(presentAddress.trim()),
    },
    {
      id: 'previous',
      title: 'Academic History & TC',
      subtitle: 'Previous school, board, percentage',
      icon: <GraduationCap size={18} />,
      isComplete: Boolean(previousSchoolName.trim()),
    },
    {
      id: 'fees',
      title: 'Class & Fee Packages',
      subtitle: 'Class section, primary plan, concession',
      icon: <CreditCard size={18} />,
      isComplete: Boolean(feeGroupId),
    },
    {
      id: 'documents',
      title: 'Documents & Certificates',
      subtitle: 'Birth cert, Aadhaar, TC, KYC records',
      icon: <FileText size={18} />,
      isComplete: documents.length > 0,
    },
    {
      id: 'initialPayment',
      title: 'Admission POS Counter',
      subtitle: 'Optional upfront fee & thermal receipt',
      icon: <DollarSign size={18} />,
      isComplete: collectInitialPayment,
    },
  ];

  const selectedClassName = feeGroups.find((g) => g._id === feeGroupId)?.name || 'Not assigned';
  const selectedPlanName = feeStructures.find((s) => s._id === selectedPlanId)?.name || 'Standard Tuition';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top Action Bar */}
      <div
        style={{
          padding: '16px 28px',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            onClick={onBack}
            className="btn btn-secondary"
            style={{ padding: '8px 14px', borderRadius: '10px' }}
            title="Return to Students Directory"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px', margin: 0 }}>
                {editStudent ? `Edit Student: ${editStudent.firstName} ${editStudent.lastName}` : 'New Student Admission Workspace'}
              </h1>
              <span className="badge badge-info" style={{ fontSize: '11px' }}>
                Full Administrative Form
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Complete demographic onboarding, parent KYC, previous schooling, fee packages & thermal POS receipts
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={onBack}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={submitting}
            className="btn btn-primary"
            style={{ padding: '9px 22px', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)' }}
          >
            <Check size={16} />
            <span>{submitting ? 'Saving Student...' : editStudent ? 'Save Changes' : 'Complete Admission'}</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Body */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '320px 1fr', overflow: 'hidden' }}>
        {/* Left Step Navigation & Live Summary Card */}
        <div
          style={{
            borderRight: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: '20px 16px',
            gap: '16px',
          }}
        >
          {/* Stepper Steps List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '0 8px 6px' }}>
              Enrollment Sections (7)
            </div>

            {steps.map((step, idx) => {
              const isActive = activeStep === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: isActive ? '1.5px solid #2563eb' : '1px solid transparent',
                    backgroundColor: isActive ? '#ffffff' : 'transparent',
                    boxShadow: isActive ? '0 4px 12px rgba(37, 99, 235, 0.08)' : 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      backgroundColor: isActive ? '#2563eb' : step.isComplete ? '#dcfce7' : '#e2e8f0',
                      color: isActive ? '#ffffff' : step.isComplete ? '#16a34a' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '13px',
                      flexShrink: 0,
                    }}
                  >
                    {step.isComplete && !isActive ? <CheckCircle2 size={18} /> : step.icon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: isActive ? 800 : 600,
                        color: isActive ? '#1d4ed8' : 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {idx + 1}. {step.title}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: '2px',
                      }}
                    >
                      {step.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Live Student Summary Card */}
          <div
            className="erp-card"
            style={{
              marginTop: 'auto',
              background: 'linear-gradient(135deg, rgba(239, 246, 255, 0.9) 0%, #ffffff 100%)',
              border: '1px solid #bfdbfe',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', marginBottom: '8px' }}>
              ⚡ Live Admission Summary
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>
              {firstName || lastName ? `${firstName} ${middleName} ${lastName}`.trim() : 'New Student'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Adm No: <strong>{admissionNo || 'Auto Generated'}</strong>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Class: <strong>{selectedClassName}</strong>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Plan: <strong>{selectedPlanName}</strong>
            </div>
            {collectInitialPayment && (
              <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: 700, color: '#16a34a', backgroundColor: '#f0fdf4', padding: '4px 8px', borderRadius: '6px' }}>
                ✓ POS Initial Paid: ₹{initialPaymentAmount || '0'}
              </div>
            )}
          </div>
        </div>

        {/* Right Form Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
            {/* ══════════════════════════════════════════════════════════════
                STEP 1: IDENTITY & DEMOGRAPHICS
            ══════════════════════════════════════════════════════════════ */}
            {activeStep === 'identity' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '1000px' }}>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)' }}>
                    Step 1: Student Identity & Official Demographics
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    Core identification numbers, official name, birth data, and social demographics.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="field-label">First Name *</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Rahul"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="field-label">Middle Name</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Kumar"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="field-label">Last Name *</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Sharma"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="field-label">Admission / SR No *</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. ADM-2025-0042"
                      value={admissionNo}
                      onChange={(e) => setAdmissionNo(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="field-label">Class Roll Number</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. 15"
                      value={rollNo}
                      onChange={(e) => setRollNo(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="field-label">Student Aadhaar UID (12 Digits)</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="12 digits"
                      maxLength={12}
                      value={aadhaarNo}
                      onChange={(e) => setAadhaarNo(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <div>
                    <label className="field-label">APAAR / PEN / National Student ID</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="APAAR ID"
                      value={apaarId}
                      onChange={(e) => setApaarId(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="field-label">Date of Birth</label>
                    <input
                      type="date"
                      className="input-field"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="field-label">Gender</label>
                    <select
                      className="input-field"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    >
                      <option value="male">👦 Male</option>
                      <option value="female">👧 Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Admission / Joining Date</label>
                    <input
                      type="date"
                      className="input-field"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                    />
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0' }} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="field-label">Social Category / Caste</label>
                    <select
                      className="input-field"
                      value={casteCategory}
                      onChange={(e) => setCasteCategory(e.target.value)}
                    >
                      <option value="General">General / OC</option>
                      <option value="OBC">OBC</option>
                      <option value="SC">SC</option>
                      <option value="ST">ST</option>
                      <option value="EWS">EWS</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Sub-Caste (Optional)</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Reddy, Brahmin, etc."
                      value={subCaste}
                      onChange={(e) => setSubCaste(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="field-label">Religion</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Hindu, Muslim, Christian"
                      value={religion}
                      onChange={(e) => setReligion(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="field-label">Mother Tongue</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Telugu, Hindi, Tamil"
                      value={motherTongue}
                      onChange={(e) => setMotherTongue(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="field-label">Blood Group</label>
                    <select
                      className="input-field"
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                    >
                      <option value="N/A">N/A (Unknown)</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Place of Birth</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="City / Town, State"
                      value={placeOfBirth}
                      onChange={(e) => setPlaceOfBirth(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="field-label">Nationality</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Indian"
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="field-label">Identification Marks</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Mole on right cheek"
                      value={identificationMarks}
                      onChange={(e) => setIdentificationMarks(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="field-label">Medical Conditions / Allergies</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Asthma, Peanut Allergy, None"
                      value={medicalNotes}
                      onChange={(e) => setMedicalNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                STEP 2: PARENTS & GUARDIAN
            ══════════════════════════════════════════════════════════════ */}
            {activeStep === 'parents' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '1000px' }}>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)' }}>
                    Step 2: Parents & Guardian KYC Profile
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    Complete contact, Aadhaar KYC, occupational profile, and emergency communications.
                  </p>
                </div>

                {/* Father Profile */}
                <div
                  style={{
                    backgroundColor: 'rgba(239, 246, 255, 0.45)',
                    border: '1px solid #bfdbfe',
                    borderRadius: '14px',
                    padding: '20px',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#1d4ed8', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>👨</span> FATHER'S PROFILE
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                    <div>
                      <label className="field-label">Father's Full Name *</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Father's full name"
                        value={fatherName}
                        onChange={(e) => setFatherName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="field-label">Mobile Number (WhatsApp) *</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="10-digit mobile number"
                        maxLength={10}
                        value={fatherPhone}
                        onChange={(e) => setFatherPhone(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                    <div>
                      <label className="field-label">Father's Aadhaar UID (12 Digits)</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="12 digits UID"
                        maxLength={12}
                        value={fatherAadhaar}
                        onChange={(e) => setFatherAadhaar(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px', marginTop: '14px' }}>
                    <div>
                      <label className="field-label">Occupation</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. Business, Govt Service"
                        value={fatherOccupation}
                        onChange={(e) => setFatherOccupation(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="field-label">Qualification</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. B.Tech, MBA"
                        value={fatherQualification}
                        onChange={(e) => setFatherQualification(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="field-label">Annual Income (₹)</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. 600000"
                        value={fatherIncome}
                        onChange={(e) => setFatherIncome(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                    <div>
                      <label className="field-label">Email Address</label>
                      <input
                        type="email"
                        className="input-field"
                        placeholder="father@gmail.com"
                        value={fatherEmail}
                        onChange={(e) => setFatherEmail(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Mother Profile */}
                <div
                  style={{
                    backgroundColor: 'rgba(253, 242, 248, 0.45)',
                    border: '1px solid #fbcfe8',
                    borderRadius: '14px',
                    padding: '20px',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#be185d', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>👩</span> MOTHER'S PROFILE
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                    <div>
                      <label className="field-label">Mother's Full Name</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Mother's full name"
                        value={motherName}
                        onChange={(e) => setMotherName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="field-label">Mother's Mobile Number</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="10-digit mobile number"
                        maxLength={10}
                        value={motherPhone}
                        onChange={(e) => setMotherPhone(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                    <div>
                      <label className="field-label">Mother's Aadhaar UID (12 Digits)</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="12 digits UID"
                        maxLength={12}
                        value={motherAadhaar}
                        onChange={(e) => setMotherAadhaar(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px', marginTop: '14px' }}>
                    <div>
                      <label className="field-label">Occupation</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. Homemaker, Doctor"
                        value={motherOccupation}
                        onChange={(e) => setMotherOccupation(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="field-label">Qualification</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. M.Sc, B.Ed"
                        value={motherQualification}
                        onChange={(e) => setMotherQualification(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="field-label">Annual Income (₹)</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. 400000"
                        value={motherIncome}
                        onChange={(e) => setMotherIncome(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                    <div>
                      <label className="field-label">Email Address</label>
                      <input
                        type="email"
                        className="input-field"
                        placeholder="mother@gmail.com"
                        value={motherEmail}
                        onChange={(e) => setMotherEmail(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Local Guardian */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '20px',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '14px' }}>
                    LOCAL GUARDIAN (OPTIONAL)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>
                    <div>
                      <label className="field-label">Guardian Name</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. Suresh Kumar"
                        value={guardianName}
                        onChange={(e) => setGuardianName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="field-label">Relationship</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. Uncle, Grandparent"
                        value={guardianRelation}
                        onChange={(e) => setGuardianRelation(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="field-label">Guardian Phone</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="10-digit phone"
                        maxLength={10}
                        value={guardianPhone}
                        onChange={(e) => setGuardianPhone(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                    <div>
                      <label className="field-label">Guardian Address</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Local address"
                        value={guardianAddress}
                        onChange={(e) => setGuardianAddress(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                STEP 3: ADDRESS & EMERGENCY
            ══════════════════════════════════════════════════════════════ */}
            {activeStep === 'address' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '1000px' }}>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)' }}>
                    Step 3: Residential Address & Emergency SOS Contacts
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    Official correspondence address, state/district, and designated emergency contact.
                  </p>
                </div>

                <div>
                  <label className="field-label">Present / Residential Address *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="House / Flat No, Street, Colony, Landmark"
                    value={presentAddress}
                    onChange={(e) => setPresentAddress(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="field-label">City / Town</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Hyderabad"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="field-label">District</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Medchal"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="field-label">State</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Telangana"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="field-label">PIN Code (6-Digit)</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. 500072"
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <input
                    type="checkbox"
                    id="sameAddrCheckFull"
                    checked={sameAddress}
                    onChange={(e) => setSameAddress(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer' }}
                  />
                  <label htmlFor="sameAddrCheckFull" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>
                    Permanent Address is identical to Present Address
                  </label>
                </div>

                {!sameAddress && (
                  <div>
                    <label className="field-label">Permanent Hometown Address</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Ancestral / permanent address"
                      value={permanentAddress}
                      onChange={(e) => setPermanentAddress(e.target.value)}
                    />
                  </div>
                )}

                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0' }} />

                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', marginBottom: '10px' }}>
                    🚨 Emergency Contact (SOS)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <div>
                      <label className="field-label">Emergency Contact Name</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Contact Person Name"
                        value={emergencyName}
                        onChange={(e) => setEmergencyName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="field-label">Emergency Phone Number</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="10-digit phone"
                        maxLength={10}
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                    <div>
                      <label className="field-label">Relationship with Student</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. Father, Uncle, Neighbor"
                        value={emergencyRelation}
                        onChange={(e) => setEmergencyRelation(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                STEP 4: PREVIOUS ACADEMIC HISTORY
            ══════════════════════════════════════════════════════════════ */}
            {activeStep === 'previous' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '1000px' }}>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)' }}>
                    Step 4: Previous Academic Record & Transfer Certificate
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    Previous school details, board affiliation, marks obtained, and TC certification.
                  </p>
                </div>

                <div>
                  <label className="field-label">Previous School Name</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. St. Joseph High School"
                    value={previousSchoolName}
                    onChange={(e) => setPreviousSchoolName(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="field-label">Affiliated Board</label>
                    <select
                      className="input-field"
                      value={previousBoard}
                      onChange={(e) => setPreviousBoard(e.target.value)}
                    >
                      <option value="">Select Board</option>
                      <option value="CBSE">CBSE</option>
                      <option value="ICSE">ICSE</option>
                      <option value="State Board">State Board</option>
                      <option value="IB">IB</option>
                      <option value="Cambridge/IGCSE">Cambridge / IGCSE</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Last Class / Grade Passed</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Grade 9"
                      value={previousClassPassed}
                      onChange={(e) => setPreviousClassPassed(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="field-label">Previous Year Marks / Percentage</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. 88.5% or A Grade"
                      value={previousPercentage}
                      onChange={(e) => setPreviousPercentage(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="field-label">Transfer Certificate (TC) Number</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. TC/2025/0984"
                      value={tcNumber}
                      onChange={(e) => setTcNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="field-label">TC Issue Date</label>
                    <input
                      type="date"
                      className="input-field"
                      value={tcDate}
                      onChange={(e) => setTcDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                STEP 5: CLASS & FEE PACKAGES
            ══════════════════════════════════════════════════════════════ */}
            {activeStep === 'fees' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '1000px' }}>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)' }}>
                    Step 5: Classroom Allocation, Fee Structure & Scholarships
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    Assign section, primary tuition package, optional addon packages, and fee concessions.
                  </p>
                </div>

                {/* Class Assignment */}
                <div>
                  <label className="field-label">Assign Class / Section *</label>
                  <select
                    className="input-field"
                    value={feeGroupId}
                    onChange={(e) => setFeeGroupId(e.target.value)}
                    style={{ fontSize: '14px', fontWeight: 700 }}
                  >
                    <option value="">-- Choose Class / Section --</option>
                    {feeGroups.map((g) => (
                      <option key={g._id} value={g._id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Primary Fee Structure */}
                <div>
                  <label className="field-label">Primary Fee Package (Tuition / Term)</label>
                  {relevantPrimaryStructures.length === 0 ? (
                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      No primary fee packages created yet.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {relevantPrimaryStructures.map((plan) => {
                        const isSelected = selectedPlanId === plan._id;
                        return (
                          <div
                            key={plan._id}
                            onClick={() => handleSelectPrimaryPlan(plan._id)}
                            style={{
                              padding: '16px',
                              borderRadius: '12px',
                              border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                              backgroundColor: isSelected ? 'rgba(239, 246, 255, 0.8)' : '#ffffff',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              boxShadow: isSelected ? '0 4px 12px rgba(37, 99, 235, 0.1)' : 'none',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '14px' }}>
                                {plan.name}
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Frequency: {plan.frequency}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 800, color: '#2563eb', fontSize: '16px' }}>
                                ₹{Number(plan.amount).toLocaleString('en-IN')}
                              </div>
                              {isSelected && (
                                <span style={{ fontSize: '11px', fontWeight: 800, color: '#16a34a' }}>✓ Selected</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Addon Fee Packages */}
                {addonStructures.length > 0 && (
                  <div>
                    <label className="field-label">Addon Packages (Transport, Labs, Special Coaching)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {addonStructures.map((addon) => {
                        const isChecked = addonFeeIds.includes(addon._id);
                        return (
                          <div
                            key={addon._id}
                            onClick={() => toggleAddon(addon._id)}
                            style={{
                              padding: '14px',
                              borderRadius: '10px',
                              border: isChecked ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                              backgroundColor: isChecked ? 'rgba(240, 253, 244, 0.7)' : '#ffffff',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                style={{ accentColor: '#10b981', cursor: 'pointer' }}
                              />
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                                {addon.name}
                              </span>
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#059669' }}>
                              +₹{Number(addon.amount).toLocaleString('en-IN')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Scholarship / Concession */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '20px',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '12px' }}>
                    🎁 Scholarship / Fee Concession
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: concessionType !== 'none' ? '1fr 1fr 1fr' : '1fr', gap: '14px' }}>
                    <div>
                      <label className="field-label">Concession Type</label>
                      <select
                        className="input-field"
                        value={concessionType}
                        onChange={(e) => setConcessionType(e.target.value)}
                      >
                        <option value="none">None (Standard Fee)</option>
                        <option value="sibling">Sibling Concession</option>
                        <option value="staff">Staff Child Concession</option>
                        <option value="merit">Merit Scholarship</option>
                        <option value="custom">Special / Custom Concession</option>
                      </select>
                    </div>
                    {concessionType !== 'none' && (
                      <>
                        <div>
                          <label className="field-label">Concession Amount (₹)</label>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="e.g. 1000"
                            value={concessionValue}
                            onChange={(e) => setConcessionValue(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="field-label">Reason / Approval Reference</label>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="e.g. Sibling discount approved"
                            value={concessionReason}
                            onChange={(e) => setConcessionReason(e.target.value)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                STEP 6: DOCUMENTS & CERTIFICATES
            ══════════════════════════════════════════════════════════════ */}
            {activeStep === 'documents' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '1000px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)' }}>
                      Step 6: KYC Certificates & Admission Documents
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                      Attach scanned documents, transfer certificates, Aadhaar cards, and marksheets.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDocInput(true)}
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '8px 14px' }}
                  >
                    <Plus size={14} />
                    <span>+ Add Custom Doc</span>
                  </button>
                </div>

                {/* Quick Add Chips */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
                    Quick-Attach Standard Documents
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {[
                      { title: 'Birth Certificate', type: 'birth_certificate', icon: '📜' },
                      { title: 'Student Aadhaar Card', type: 'aadhaar', icon: '🆔' },
                      { title: 'Transfer Certificate (TC)', type: 'tc', icon: '🏫' },
                      { title: 'Previous Marksheet', type: 'marksheet', icon: '📊' },
                      { title: 'Father Aadhaar Card', type: 'aadhaar', icon: '👨' },
                      { title: 'Mother Aadhaar Card', type: 'aadhaar', icon: '👩' },
                      { title: 'Caste Certificate', type: 'caste_certificate', icon: '🏷️' },
                      { title: 'Passport Photo', type: 'photo', icon: '📸' },
                    ].map((item) => {
                      const isAdded = documents.some((d) => d.title.toLowerCase() === item.title.toLowerCase());
                      return (
                        <button
                          key={item.title}
                          type="button"
                          disabled={isAdded}
                          onClick={() => handleAddDocument(item.title, '', item.type)}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '10px',
                            border: isAdded ? '1px solid #86efac' : '1px solid #cbd5e1',
                            backgroundColor: isAdded ? '#f0fdf4' : '#ffffff',
                            color: isAdded ? '#15803d' : 'var(--text-main)',
                            fontSize: '12px',
                            fontWeight: isAdded ? 700 : 500,
                            cursor: isAdded ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <span>{item.icon}</span>
                          <span>{isAdded ? `✓ ${item.title}` : `+ ${item.title}`}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Add Form */}
                {showDocInput && (
                  <div
                    style={{
                      padding: '18px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '14px',
                      border: '1px dashed #94a3b8',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>
                      Attach New Document Record
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '12px' }}>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Document Title (e.g. Migration Certificate)"
                        value={docTitle}
                        onChange={(e) => setDocTitle(e.target.value)}
                      />
                      <input
                        type="text"
                        className="input-field"
                        placeholder="URL / S3 Link / Local Drive Path (Optional)"
                        value={docUrl}
                        onChange={(e) => setDocUrl(e.target.value)}
                      />
                      <select
                        className="input-field"
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                      >
                        <option value="birth_certificate">Birth Certificate</option>
                        <option value="aadhaar">Aadhaar Card</option>
                        <option value="tc">Transfer Certificate</option>
                        <option value="marksheet">Marksheet</option>
                        <option value="caste_certificate">Caste Certificate</option>
                        <option value="photo">Photo</option>
                        <option value="other">Other Document</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setShowDocInput(false)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '12px' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddDocument(docTitle, docUrl, docType)}
                        className="btn btn-primary"
                        style={{ padding: '6px 16px', fontSize: '12px' }}
                      >
                        Add to Document List
                      </button>
                    </div>
                  </div>
                )}

                {/* Attached Documents List */}
                {documents.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '40px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      color: 'var(--text-subtle)',
                      fontSize: '13px',
                    }}
                  >
                    No documents attached yet. Click the quick-attach standard buttons above.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {documents.map((doc, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          backgroundColor: '#f8fafc',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <FileText size={18} color="#2563eb" />
                          <div>
                            <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>
                              {doc.title}
                            </span>
                            <span
                              style={{
                                marginLeft: '10px',
                                fontSize: '10px',
                                fontWeight: 800,
                                backgroundColor: '#e2e8f0',
                                color: '#475569',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                textTransform: 'uppercase',
                              }}
                            >
                              {doc.docType}
                            </span>
                            {doc.url && (
                              <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '2px' }}>
                                {doc.url}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDocument(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '6px',
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                STEP 7: ADMISSION POS INITIAL PAYMENT
            ══════════════════════════════════════════════════════════════ */}
            {activeStep === 'initialPayment' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '1000px' }}>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)' }}>
                    Step 7: Admission POS Fee Collection & Thermal Receipt (Optional)
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    Optionally collect admission fee or first installment immediately and trigger silent thermal receipt printing.
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px',
                    borderRadius: '14px',
                    border: '1px solid #bfdbfe',
                    backgroundColor: 'rgba(239, 246, 255, 0.5)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, color: '#1e3a8a', fontSize: '15px' }}>
                      Collect Initial Admission Fee at Counter?
                    </div>
                    <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '3px' }}>
                      Instantly records fee ledger entry and prints silent thermal POS receipt upon student creation.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={collectInitialPayment}
                    onChange={(e) => setCollectInitialPayment(e.target.checked)}
                    style={{ width: '22px', height: '22px', accentColor: '#2563eb', cursor: 'pointer' }}
                  />
                </div>

                {collectInitialPayment && (
                  <div
                    style={{
                      padding: '22px',
                      backgroundColor: '#ffffff',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label className="field-label">Collected Amount (₹) *</label>
                        <input
                          type="number"
                          className="input-field"
                          placeholder="e.g. 5000"
                          value={initialPaymentAmount}
                          onChange={(e) => setInitialPaymentAmount(e.target.value)}
                          style={{ fontSize: '18px', fontWeight: 800, color: '#2563eb' }}
                        />
                      </div>
                      <div>
                        <label className="field-label">Payment Mode *</label>
                        <select
                          className="input-field"
                          value={initialPaymentMethod}
                          onChange={(e) => setInitialPaymentMethod(e.target.value)}
                        >
                          <option value="cash">💵 Cash Counter</option>
                          <option value="upi">📱 UPI / QR Code</option>
                          <option value="card">💳 Card POS</option>
                          <option value="net_banking">🏦 Net Banking / Bank Transfer</option>
                          <option value="cheque">📝 Cheque</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="field-label">Receipt Particulars / Notes</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. Admission Fee + Term 1 Tuition"
                        value={initialPaymentNotes}
                        onChange={(e) => setInitialPaymentNotes(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '8px' }}>
                      <input
                        type="checkbox"
                        id="printThermalCheckFull"
                        checked={printReceiptOnSave}
                        onChange={(e) => setPrintReceiptOnSave(e.target.checked)}
                        style={{ width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer' }}
                      />
                      <label htmlFor="printThermalCheckFull" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Printer size={16} color="#2563eb" />
                        <span>Silent Print POS Thermal Receipt ({paperSize}) immediately upon completion</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Stepper Navigation Controls */}
          <div
            style={{
              padding: '16px 40px',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              {activeStep !== 'identity' && (
                <button
                  type="button"
                  onClick={() => {
                    const idx = steps.findIndex((s) => s.id === activeStep);
                    if (idx > 0) setActiveStep(steps[idx - 1].id);
                  }}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <ChevronLeft size={16} />
                  <span>Previous Step</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {activeStep !== 'initialPayment' ? (
                <button
                  type="button"
                  onClick={() => {
                    const idx = steps.findIndex((s) => s.id === activeStep);
                    if (idx < steps.length - 1) setActiveStep(steps[idx + 1].id);
                  }}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>Next Step</span>
                  <ChevronRight size={16} />
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={submitting}
                className="btn btn-primary"
                style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Check size={18} />
                <span>{submitting ? 'Saving Student...' : editStudent ? 'Save Student Changes' : 'Complete Admission'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
