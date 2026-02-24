"use client";

import { useState, useEffect } from "react";
import { InventoryReportType, InventoryReportSeverity } from "@prisma/client";
import ConfirmDeleteReportModal from "./ConfirmDeleteReportModal";
import { reportTypeLabel, reportSeverityLabel } from "@/lib/inventory-i18n";

interface InventoryReport {
  id: string;
  itemId: string;
  type: InventoryReportType;
  severity: InventoryReportSeverity;
  description: string | null;
  status: string;
}

interface InventoryReportModalProps {
  isOpen: boolean;
  itemId: string;
  itemName: string;
  existingReport?: InventoryReport | null;
  onClose: () => void;
  onSubmit: (
    type: InventoryReportType,
    severity: InventoryReportSeverity,
    description: string | null
  ) => void;
  onDelete?: () => void;
}

const REPORT_TYPE_OPTIONS: { value: InventoryReportType; label: string }[] = [
  { value: "DAMAGED_WORKS", label: reportTypeLabel("DAMAGED_WORKS") },
  { value: "DAMAGED_NOT_WORKING", label: reportTypeLabel("DAMAGED_NOT_WORKING") },
  { value: "MISSING_PHYSICAL", label: reportTypeLabel("MISSING_PHYSICAL") },
  { value: "REPLACED_DIFFERENT", label: reportTypeLabel("REPLACED_DIFFERENT") },
  { value: "DETAILS_MISMATCH", label: reportTypeLabel("DETAILS_MISMATCH") },
  { value: "OTHER", label: reportTypeLabel("OTHER") },
];

const SEVERITY_OPTIONS: { value: InventoryReportSeverity; label: string }[] = [
  { value: "URGENT", label: reportSeverityLabel("URGENT") },
  { value: "IMPORTANT", label: reportSeverityLabel("IMPORTANT") },
  { value: "INFO", label: reportSeverityLabel("INFO") },
];

export default function InventoryReportModal({
  isOpen,
  itemId,
  itemName,
  existingReport,
  onClose,
  onSubmit,
  onDelete,
}: InventoryReportModalProps) {
  const [selectedType, setSelectedType] = useState<InventoryReportType | null>(
    existingReport?.type || null
  );
  const [selectedSeverity, setSelectedSeverity] = useState<InventoryReportSeverity>(
    existingReport?.severity || "INFO"
  );
  const [description, setDescription] = useState(existingReport?.description || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Actualizar estado cuando cambie el reporte existente o cuando se abra el modal
  useEffect(() => {
    if (existingReport) {
      setSelectedType(existingReport.type);
      setSelectedSeverity(existingReport.severity);
      setDescription(existingReport.description || "");
    } else {
      setSelectedType(null);
      setSelectedSeverity("INFO");
      setDescription("");
    }
  }, [existingReport, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!selectedType) {
      alert("Debes seleccionar un tipo de reporte");
      return;
    }

    onSubmit(selectedType, selectedSeverity, description.trim() || null);
  };

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-neutral-900">
            {existingReport ? "Ver / Editar incidencia" : "Reportar incidencia"}
          </h2>
          <p className="text-sm text-neutral-600 mt-1">{itemName}</p>
          {existingReport && (
            <p className="text-xs text-neutral-500 mt-1">
              Estado: {existingReport.status === "PENDING" ? "Pendiente" : existingReport.status}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Tipo de incidencia <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {REPORT_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedType(option.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                    selectedType === option.value
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Severidad */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Severidad
            </label>
            <div className="flex flex-wrap gap-2">
              {SEVERITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedSeverity(option.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                    selectedSeverity === option.value
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Descripción (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe la incidencia..."
              rows={4}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-between">
            {existingReport && onDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                Eliminar reporte
              </button>
            )}
          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 text-sm font-medium bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              {existingReport ? "Actualizar reporte" : "Enviar reporte"}
            </button>
          </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      <ConfirmDeleteReportModal
        isOpen={showDeleteConfirm}
        itemName={itemName}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          if (onDelete) {
            onDelete();
          }
        }}
      />
    </>
  );
}

