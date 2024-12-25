import { supabase } from "./supabaseClient";

export const handleFileUpload = async ({ file, user, lectureId, onSuccess, onError }) => {
  try {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error("Only PDF, DOCX, and PPTX files are allowed");
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`; 
    const filePath = `${user.id}/${lectureId}/${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from("lecture-files")
      .upload(filePath, file);

    if (uploadError) throw uploadError;
    console.log(data)
    const {
      data: { publicUrl },
    } = supabase.storage.from("lecture-files").getPublicUrl(filePath);

    const newFile = {
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type,
      size: file.size,
      url: publicUrl,
      path: filePath,
      uploaded_at: new Date().toISOString(),
    };

    const { data: userData, error: fetchError } = await supabase
      .from("users")
      .select("subjects")
      .eq("user_id", user.id)
      .single();

    if (fetchError) throw fetchError;

    const updatedSubjects = userData.subjects.map((subject) => {
      if (subject.title.toLowerCase()) {
        return {
          ...subject,
          lectures: subject.lectures.map((lecture) => {
            if (lecture.id === lectureId) {
              return {
                ...lecture,
                files: [...(lecture.files || []), newFile],
              };
            }
            return lecture;
          }),
        };
      }
      return subject;
    });

    const { error: updateError } = await supabase
      .from("users")
      .update({ subjects: updatedSubjects })
      .eq("user_id", user.id);

    if (updateError) throw updateError;

    onSuccess(newFile);
  } catch (error) {
    console.error("Error uploading file:", error);
    onError(error.message);
  }
};

export const handleDeleteFile = async ({ fileId, files, user, lectureId, onSuccess, onError }) => {
  try {
    const fileToDelete = files.find((f) => f.id === fileId);

    const { error: deleteError } = await supabase.storage
      .from("lecture-files")
      .remove([fileToDelete.path]);

    if (deleteError) throw deleteError;

    const { data: userData, error: fetchError } = await supabase
      .from("users")
      .select("subjects")
      .eq("user_id", user.id)
      .single();

    if (fetchError) throw fetchError;

    const updatedSubjects = userData.subjects.map((subject) => {
      if (subject.title.toLowerCase()) {
        return {
          ...subject,
          lectures: subject.lectures.map((lecture) => {
            if (lecture.id === lectureId) {
              return {
                ...lecture,
                files: lecture.files.filter((f) => f.id !== fileId),
              };
            }
            return lecture;
          }),
        };
      }
      return subject;
    });

    const { error: updateError } = await supabase
      .from("users")
      .update({ subjects: updatedSubjects })
      .eq("user_id", user.id);

    if (updateError) throw updateError;

    onSuccess(fileId);
  } catch (error) {
    console.error("Error deleting file:", error);
    onError(error.message);
  }
};
