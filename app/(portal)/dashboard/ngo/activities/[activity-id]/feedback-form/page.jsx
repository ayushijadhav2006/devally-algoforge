"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Copy, Save, ChevronUp, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";

const FeedbackFormBuilder = () => {
  const { "activity-id": activityId } = useParams();
  const [formFields, setFormFields] = useState([]);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [shareableLink, setShareableLink] = useState("");

  const fieldTypes = [
    { value: "short_text", label: "Short Text" },
    { value: "long_text", label: "Long Text" },
    { value: "number", label: "Number" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone" },
    { value: "single_choice", label: "Single Choice" },
    { value: "multiple_choice", label: "Multiple Choice" },
    { value: "rating", label: "Rating" },
  ];

  useEffect(() => {
    loadForm();
  }, [activityId]);

  const loadForm = async () => {
    try {
      const formDoc = await getDoc(
        doc(db, "activities", activityId, "forms", "feedback")
      );
      if (formDoc.exists()) {
        const data = formDoc.data();
        setFormFields(data.fields || getDefaultFields());
        setFormTitle(data.title || "");
        setFormDescription(data.description || "");
        setShareableLink(window.location.origin + "/feedback/" + activityId);
      } else {
        // If form doesn't exist, initialize with default fields
        setFormFields(getDefaultFields());
      }
    } catch (error) {
      console.error("Error loading form:", error);
      toast.error("Failed to load form");
    }
  };

  const getDefaultFields = () => {
    return [
      {
        id: uuidv4(),
        type: "short_text",
        label: "Name",
        required: true,
        options: [],
        placeholder: "Enter your name",
      },
      {
        id: uuidv4(),
        type: "email",
        label: "Email",
        required: true,
        options: [],
        placeholder: "Enter your email",
      },
      {
        id: uuidv4(),
        type: "rating",
        label: "Rating",
        required: true,
        options: [],
        placeholder: "Rate your experience",
      },
    ];
  };

  const addField = () => {
    const newField = {
      id: uuidv4(),
      type: "short_text",
      label: "New Question",
      required: false,
      options: [],
      placeholder: "",
    };
    setFormFields([...formFields, newField]);
  };

  const updateField = (index, field) => {
    const newFields = [...formFields];
    newFields[index] = field;
    setFormFields(newFields);
  };

  const removeField = (index) => {
    const field = formFields[index];
    // Check if the field is one of the default required fields
    if (
      field.label === "Name" ||
      field.label === "Email" ||
      field.label === "Rating"
    ) {
      toast.error("Cannot delete required default fields");
      return;
    }
    const newFields = [...formFields];
    newFields.splice(index, 1);
    setFormFields(newFields);
  };

  const moveField = (index, direction) => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === formFields.length - 1)
    ) {
      return;
    }

    const newFields = [...formFields];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    [newFields[index], newFields[newIndex]] = [
      newFields[newIndex],
      newFields[index],
    ];
    setFormFields(newFields);
  };

  const saveForm = async () => {
    try {
      // Validate required fields
      if (!formTitle.trim()) {
        toast.error("Form title is required");
        return;
      }
      if (!formDescription.trim()) {
        toast.error("Form description is required");
        return;
      }

      const formId = uuidv4();
      await setDoc(doc(db, "activities", activityId, "forms", "feedback"), {
        id: formId,
        title: formTitle,
        description: formDescription,
        fields: formFields,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      toast.success("Form saved successfully");
      setShareableLink(window.location.origin + "/feedback/" + activityId);
    } catch (error) {
      console.error("Error saving form:", error);
      toast.error("Failed to save form");
    }
  };

  const copyShareableLink = () => {
    navigator.clipboard.writeText(shareableLink);
    toast.success("Link copied to clipboard");
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Feedback Form Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>Form Title *</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Enter form title"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label>Form Description *</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Enter form description"
                className="mt-1"
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            {formFields.map((field, index) => (
              <div key={field.id} className="border rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveField(index, "up")}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveField(index, "down")}
                      disabled={index === formFields.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeField(index)}
                    disabled={
                      field.label === "Name" ||
                      field.label === "Email" ||
                      field.label === "Rating"
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Question Type</Label>
                    <Select
                      value={field.type}
                      onValueChange={(value) =>
                        updateField(index, { ...field, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Question Label</Label>
                    <Input
                      value={field.label}
                      onChange={(e) =>
                        updateField(index, {
                          ...field,
                          label: e.target.value,
                        })
                      }
                      placeholder="Enter question"
                    />
                  </div>

                  {(field.type === "single_choice" ||
                    field.type === "multiple_choice") && (
                    <div>
                      <Label>Options</Label>
                      <div className="space-y-2">
                        {field.options.map((option, optionIndex) => (
                          <div
                            key={optionIndex}
                            className="flex items-center gap-2"
                          >
                            <Input
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...field.options];
                                newOptions[optionIndex] = e.target.value;
                                updateField(index, {
                                  ...field,
                                  options: newOptions,
                                });
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newOptions = [...field.options];
                                newOptions.splice(optionIndex, 1);
                                updateField(index, {
                                  ...field,
                                  options: newOptions,
                                });
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            updateField(index, {
                              ...field,
                              options: [...field.options, ""],
                            });
                          }}
                        >
                          Add Option
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Switch
                      id={`required-${field.id}`}
                      checked={field.required}
                      onCheckedChange={(checked) =>
                        updateField(index, {
                          ...field,
                          required: checked,
                        })
                      }
                    />
                    <Label htmlFor={`required-${field.id}`}>Required</Label>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Button onClick={addField} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
            <Button onClick={saveForm}>
              <Save className="h-4 w-4 mr-2" />
              Save Form
            </Button>
          </div>

          {shareableLink && (
            <div className="flex items-center gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
              <h2>Shareable Link</h2>
              <Input value={shareableLink} readOnly />
              <Button onClick={copyShareableLink} variant="outline">
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackFormBuilder;
